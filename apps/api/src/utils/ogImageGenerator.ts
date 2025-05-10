import puppeteer from "@cloudflare/puppeteer";
import { type Bindings } from "../context"; // To get R2Bucket and Fetcher types if needed

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

interface OgImageGeneratorParams {
  env: Pick<Bindings, "BROWSER" | "WEB_HOST" | "BUCKET">;
  executionId: string;
  sharedExecutionPath?: string; // e.g., "/share/executions/"
}

/**
 * Generates an OG image for a given execution, saves it to R2, and returns the R2 key.
 * Throws an error if any step fails.
 */
export async function generateExecutionOgImage({
  env,
  executionId,
  sharedExecutionPath = "/share/executions/", // Default path
}: OgImageGeneratorParams): Promise<string> {
  let browser = null;
  console.log(
    `[ogImageGenerator] Starting OG image generation for execution ID: ${executionId}`
  );

  try {
    console.log("[ogImageGenerator] Launching browser...");
    browser = await puppeteer.launch(env.BROWSER as any);
    const page = await browser.newPage();

    const targetUrl = `${env.WEB_HOST}${sharedExecutionPath}${executionId}`;
    console.log(`[ogImageGenerator] Navigating to ${targetUrl} for screenshot`);

    await page.setViewport({ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT });
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    console.log("[ogImageGenerator] Taking screenshot...");
    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 80,
    });
    const r2Key = `og-images/${executionId}.jpg`;

    console.log(`[ogImageGenerator] Saving OG Image to R2 with key: ${r2Key}`);
    await env.BUCKET.put(r2Key, screenshotBuffer, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    console.log("[ogImageGenerator] OG Image saved successfully.");

    return r2Key;
  } catch (error) {
    console.error(
      `[ogImageGenerator] Error during OG image generation for ${executionId}: ${error}`
    );
    // Re-throw the error to be handled by the caller
    throw error;
  } finally {
    if (browser) {
      console.log("[ogImageGenerator] Closing browser...");
      await browser.close();
    }
  }
}
