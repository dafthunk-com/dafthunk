import puppeteer from "@cloudflare/puppeteer";

import { type Bindings } from "../context";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

interface OgImageGeneratorParams {
  env: Pick<Bindings, "BROWSER" | "WEB_HOST" | "BUCKET">;
  executionId: string;
  organizationId: string;
  sharedExecutionPath?: string;
}

/**
 * Generates an OG image for a given execution, saves it to R2, and returns the R2 key.
 * Throws an error if any step fails.
 */
export async function generateExecutionOgImage({
  env,
  executionId,
  organizationId,
  sharedExecutionPath = "/public/executions/",
}: OgImageGeneratorParams): Promise<void> {
  let browser = null;
  console.log(
    `[ogImageGenerator] Starting OG image generation for execution ID: ${executionId}`
  );

  try {
    browser = await puppeteer.launch(env.BROWSER as any);
    const page = await browser.newPage();

    const targetUrl = `${env.WEB_HOST}${sharedExecutionPath}${executionId}?fullscreen`;

    await page.setViewport({ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT });
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 80,
    });

    const key = `images/og-execution-${executionId}.jpeg`;
    await env.BUCKET.put(key, screenshotBuffer, {
      httpMetadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
      customMetadata: {
        executionId,
        organizationId,
      },
    });
  } catch (error) {
    console.error(
      `[ogImageGenerator] Error during OG image generation for ${executionId}: ${error}`
    );
    // Re-throw the error to be handled by the caller
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
