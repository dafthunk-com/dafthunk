import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const WORK_DIR = "/tmp/ffmpeg-jobs";
const jobs = new Map();

await mkdir(WORK_DIR, { recursive: true });

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // POST /jobs — start a job (type: "concat" | "clip" | "frame")
    if (req.method === "POST" && url.pathname === "/jobs") {
      const body = await readBody(req);
      const payload = JSON.parse(body);
      const { type } = payload;

      const id = randomUUID();
      const jobDir = join(WORK_DIR, id);
      await mkdir(jobDir, { recursive: true });
      jobs.set(id, { status: "processing" });

      let processor;

      if (type === "concat") {
        const { videos } = payload;
        if (!Array.isArray(videos) || videos.length < 2) {
          await rm(jobDir, { recursive: true, force: true });
          jobs.delete(id);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "At least 2 video URLs required" }));
          return;
        }
        processor = processConcat(id, jobDir, videos);
      } else if (type === "clip") {
        const { video, start, end } = payload;
        if (!video || start == null || end == null) {
          await rm(jobDir, { recursive: true, force: true });
          jobs.delete(id);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing video, start, or end" }));
          return;
        }
        processor = processClip(id, jobDir, video, start, end);
      } else if (type === "frame") {
        const { video, position } = payload;
        if (!video || (position !== "first" && position !== "last")) {
          await rm(jobDir, { recursive: true, force: true });
          jobs.delete(id);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: 'Missing video or invalid position (use "first" or "last")' })
          );
          return;
        }
        processor = processFrame(id, jobDir, video, position);
      } else {
        await rm(jobDir, { recursive: true, force: true });
        jobs.delete(id);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Unknown job type: ${type}` }));
        return;
      }

      processor.catch((err) => {
        console.error(`Job ${id} failed:`, err);
        jobs.set(id, { status: "failed", error: err.message });
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id, status: "processing" }));
      return;
    }

    // GET /jobs/:id — check job status
    const statusMatch = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (req.method === "GET" && statusMatch) {
      const id = statusMatch[1];
      const job = jobs.get(id);
      if (!job) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id, status: job.status, error: job.error }));
      return;
    }

    // GET /jobs/:id/output — download result (content-type varies by job type)
    const outputMatch = url.pathname.match(/^\/jobs\/([^/]+)\/output$/);
    if (req.method === "GET" && outputMatch) {
      const id = outputMatch[1];
      const job = jobs.get(id);
      if (!job || job.status !== "completed") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Job not found or not completed" }));
        return;
      }

      const data = await readFile(job.outputPath);
      res.writeHead(200, {
        "Content-Type": job.mimeType,
        "Content-Length": data.length,
      });
      res.end(data);

      // Schedule cleanup after download
      setTimeout(() => cleanupJob(id), 60_000);
      return;
    }

    // Health check
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    console.error("Request error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

// ─── Concat ──────────────────────────────────────────────────────────────────

/**
 * Download videos, probe for resolution/audio, then run ffmpeg concat.
 */
async function processConcat(id, jobDir, videoUrls) {
  const inputFiles = [];

  for (let i = 0; i < videoUrls.length; i++) {
    const response = await fetch(videoUrls[i]);
    if (!response.ok) {
      throw new Error(`Failed to download video ${i}: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const inputPath = join(jobDir, `input_${i}`);
    await writeFile(inputPath, buffer);
    inputFiles.push(inputPath);
  }

  // Probe first video for target resolution
  const probe = await probeVideo(inputFiles[0]);
  const videoStream = probe.streams.find((s) => s.codec_type === "video");
  if (!videoStream) throw new Error("First input has no video stream");

  // Ensure even dimensions (required for h264)
  const width = videoStream.width - (videoStream.width % 2);
  const height = videoStream.height - (videoStream.height % 2);

  // Check if ALL videos have audio
  const allProbes = await Promise.all(inputFiles.map(probeVideo));
  const allHaveAudio = allProbes.every((p) =>
    p.streams.some((s) => s.codec_type === "audio")
  );

  const outputPath = join(jobDir, "output.mp4");
  await runFFmpegConcat(inputFiles, outputPath, width, height, allHaveAudio);

  jobs.set(id, { status: "completed", outputPath, mimeType: "video/mp4" });
}

// ─── Clip ─────────────────────────────────────────────────────────────────────

/**
 * Download a video and clip it to [start, end] seconds.
 */
async function processClip(id, jobDir, videoUrl, start, end) {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const inputPath = join(jobDir, "input");
  await writeFile(inputPath, buffer);

  const probe = await probeVideo(inputPath);
  const hasAudio = probe.streams.some((s) => s.codec_type === "audio");

  const outputPath = join(jobDir, "output.mp4");
  await runFFmpegClip(inputPath, outputPath, start, end, hasAudio);

  jobs.set(id, { status: "completed", outputPath, mimeType: "video/mp4" });
}

// ─── Frame extraction ─────────────────────────────────────────────────────────

/**
 * Download a video and extract its first or last frame as JPEG.
 */
async function processFrame(id, jobDir, videoUrl, position) {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const inputPath = join(jobDir, "input");
  await writeFile(inputPath, buffer);

  const outputPath = join(jobDir, "output.jpg");
  await runFFmpegFrame(inputPath, outputPath, position);

  jobs.set(id, { status: "completed", outputPath, mimeType: "image/jpeg" });
}

// ─── FFmpeg helpers ───────────────────────────────────────────────────────────

/**
 * Concatenate videos using ffmpeg filter_complex.
 * Scales all inputs to match the target resolution with letterboxing.
 */
function runFFmpegConcat(inputFiles, outputPath, width, height, includeAudio) {
  const n = inputFiles.length;
  const inputs = inputFiles.flatMap((f) => ["-i", f]);

  // Scale all videos to target resolution (letterbox if aspect ratio differs)
  const scaleFilters = inputFiles
    .map(
      (_, i) =>
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
    )
    .join(";");

  const concatStreams = Array.from({ length: n }, (_, i) =>
    includeAudio ? `[v${i}][${i}:a:0]` : `[v${i}]`
  ).join("");

  const filter = `${scaleFilters};${concatStreams}concat=n=${n}:v=1:a=${includeAudio ? 1 : 0}[outv]${includeAudio ? "[outa]" : ""}`;

  const args = [
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    ...(includeAudio ? ["-map", "[outa]"] : []),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    ...(includeAudio ? ["-c:a", "aac"] : []),
    "-movflags",
    "+faststart",
    "-y",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: 300_000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

/**
 * Clip a video to [start, end] seconds using input-seeking for speed.
 * Probes for audio presence to conditionally include audio encoding.
 */
function runFFmpegClip(inputPath, outputPath, start, end, includeAudio) {
  const duration = end - start;
  const args = [
    "-ss",
    String(start),
    "-i",
    inputPath,
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    ...(includeAudio ? ["-c:a", "aac"] : ["-an"]),
    "-movflags",
    "+faststart",
    "-y",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: 300_000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

/**
 * Extract a single frame from a video as JPEG.
 * Uses -sseof for last frame (seeks from end) and default for first frame.
 */
function runFFmpegFrame(inputPath, outputPath, position) {
  const args =
    position === "last"
      ? ["-sseof", "-0.1", "-i", inputPath, "-vframes", "1", "-q:v", "2", "-y", outputPath]
      : ["-i", inputPath, "-vframes", "1", "-q:v", "2", "-y", outputPath];

  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: 60_000 }, (err, _stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

/**
 * Probe a video file for stream information (resolution, audio presence).
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_streams", filePath],
      (err, stdout) => {
        if (err) reject(new Error(`ffprobe failed: ${err.message}`));
        else resolve(JSON.parse(stdout));
      }
    );
  });
}

async function cleanupJob(id) {
  const job = jobs.get(id);
  if (job?.outputPath) {
    try {
      await rm(join(WORK_DIR, id), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  jobs.delete(id);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

server.listen(8080, () => {
  console.log("FFmpeg container server listening on port 8080");
});
