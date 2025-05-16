import puppeteer from "@cloudflare/puppeteer";
import { type Bindings } from "../context"; // To get R2Bucket and Fetcher types if needed
import { ObjectStore } from "../runtime/objectStore";

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
  sharedExecutionPath = "/public/executions/", // Default path
}: OgImageGeneratorParams): Promise<string> {
  let browser = null;
  console.log(
    `[ogImageGenerator] Starting OG image generation for execution ID: ${executionId}`
  );

  try {
    console.log("[ogImageGenerator] Launching browser...");
    browser = await puppeteer.launch(env.BROWSER as any);
    const page = await browser.newPage();

    const targetUrl = `${env.WEB_HOST}${sharedExecutionPath}${executionId}?fullscreen`;
    console.log(`[ogImageGenerator] Navigating to ${targetUrl} for screenshot`);

    await page.setViewport({ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT });
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    console.log("[ogImageGenerator] Taking screenshot...");
    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 80,
    });

    const objectStore = new ObjectStore(env.BUCKET);
    const mimeType = "image/jpeg";

    console.log(
      `[ogImageGenerator] Saving OG Image to R2 via ObjectStore for execution: ${executionId}`
    );
    const referenceId = `og-execution-${executionId}`;
    const objectReference = await objectStore.writeObjectWithId(
      referenceId,
      screenshotBuffer,
      mimeType,
      organizationId,
      executionId
    );
    console.log(
      `[ogImageGenerator] OG Image saved successfully. Object ID: ${objectReference.id}`
    );

    return objectReference.id;
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
