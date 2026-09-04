import type { Node } from "@dafthunk/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MultiStepNodeContext } from "../../types";
import { CloudflareGatewayModelNode } from "./cloudflare-gateway-model-node";

/**
 * What a partner model hands back, and what the node has to make of it.
 *
 * Two conventions are in play and only one used to work. A model given an
 * upload destination writes the file there and the node reads bytes back; a
 * model without one returns a link. The link was being assigned straight to a
 * blob output, where the runtime's converter drops anything that is not bytes
 * — so the run went green with no video in it, which is what shipped.
 */
function makeNode(
  outputs: Array<{ name: string; type: string }> = [
    { name: "video", type: "video" },
  ]
): CloudflareGatewayModelNode {
  return new CloudflareGatewayModelNode({
    nodeId: "test",
    type: "cloudflare-gateway-model",
    inputs: [
      { name: "model", type: "string" },
      { name: "prompt", type: "string" },
    ],
    outputs,
  } as unknown as Node);
}

function makeContext(aiRun: ReturnType<typeof vi.fn>): MultiStepNodeContext {
  return {
    nodeId: "test",
    inputs: { model: "alibaba/wan-3.0", prompt: "a village" },
    workflowId: "test",
    organizationId: "test-org",
    mode: "dev" as const,
    secrets: {},
    env: { AI: { run: aiRun }, AI_OPTIONS: {} },
    doStep: <T>(fn: () => Promise<T>) => fn(),
  } as unknown as MultiStepNodeContext;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function stubDownload(
  body: Uint8Array,
  headers: Record<string, string> = { "content-type": "video/mp4" },
  status = 200
) {
  const fetchMock = vi.fn(
    async () => new Response(status === 200 ? body : null, { status, headers })
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("CloudflareGatewayModelNode — returned links", () => {
  it("downloads a link on a blob output and hands back the bytes", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);
    const fetchMock = stubDownload(bytes);
    const aiRun = vi
      .fn()
      .mockResolvedValue({ video: "https://files.example.com/v.mp4" });

    const result = await makeNode().execute(makeContext(aiRun));

    expect(fetchMock).toHaveBeenCalledWith("https://files.example.com/v.mp4");
    expect(result.status).toBe("completed");
    expect(result.outputs?.video).toEqual({
      data: bytes,
      mimeType: "video/mp4",
    });
  });

  it("accepts the object form of a link", async () => {
    const bytes = new Uint8Array([9]);
    stubDownload(bytes);
    const aiRun = vi
      .fn()
      .mockResolvedValue({ video: { url: "https://files.example.com/v.mp4" } });

    const result = await makeNode().execute(makeContext(aiRun));

    expect(result.outputs?.video).toEqual({
      data: bytes,
      mimeType: "video/mp4",
    });
  });

  it("falls back to the output's media type when the server names none", async () => {
    stubDownload(new Uint8Array([1]), {});
    const aiRun = vi
      .fn()
      .mockResolvedValue({ video: "https://files.example.com/v" });

    const result = await makeNode().execute(makeContext(aiRun));

    expect((result.outputs?.video as { mimeType: string }).mimeType).toBe(
      "video/mp4"
    );
  });

  it("leaves a link on a string output alone", async () => {
    const fetchMock = stubDownload(new Uint8Array([1]));
    const aiRun = vi
      .fn()
      .mockResolvedValue({ link: "https://files.example.com/v.mp4" });

    const result = await makeNode([{ name: "link", type: "string" }]).execute(
      makeContext(aiRun)
    );

    // The URL is the answer here, not a way of reaching one.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.outputs?.link).toBe("https://files.example.com/v.mp4");
  });

  it("passes through a value that is not a link", async () => {
    const fetchMock = stubDownload(new Uint8Array([1]));
    const aiRun = vi.fn().mockResolvedValue({ video: "pending-task-42" });

    const result = await makeNode().execute(makeContext(aiRun));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.outputs?.video).toBe("pending-task-42");
  });

  it("reports a download failure instead of completing empty", async () => {
    stubDownload(new Uint8Array(), {}, 403);
    const aiRun = vi
      .fn()
      .mockResolvedValue({ video: "https://files.example.com/v.mp4" });

    const result = await makeNode().execute(makeContext(aiRun));

    // The failure this whole path exists to stop being silent.
    expect(result.status).toBe("error");
    expect(result.error).toContain("403");
  });

  it("refuses a file too large to hold, by its declared length", async () => {
    stubDownload(new Uint8Array([1]), {
      "content-type": "video/mp4",
      "content-length": String(128 * 1024 * 1024),
    });
    const aiRun = vi
      .fn()
      .mockResolvedValue({ video: "https://files.example.com/v.mp4" });

    const result = await makeNode().execute(makeContext(aiRun));

    expect(result.status).toBe("error");
    expect(result.error).toContain("128MB");
  });
});
