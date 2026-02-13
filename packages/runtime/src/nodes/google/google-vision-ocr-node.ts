import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

interface VisionTextAnnotation {
  locale?: string;
  description: string;
  boundingPoly?: {
    vertices: Array<{ x?: number; y?: number }>;
  };
}

interface VisionFullTextAnnotation {
  text: string;
  pages?: Array<{
    property?: {
      detectedLanguages?: Array<{
        languageCode: string;
        confidence?: number;
      }>;
    };
    confidence?: number;
  }>;
}

interface VisionAnnotateResponse {
  responses: Array<{
    textAnnotations?: VisionTextAnnotation[];
    fullTextAnnotation?: VisionFullTextAnnotation;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

/**
 * Google Vision OCR node implementation using the Cloud Vision REST API.
 * Extracts text from images using TEXT_DETECTION or DOCUMENT_TEXT_DETECTION.
 */
export class GoogleVisionOcrNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "google-vision-ocr",
    name: "Google Vision OCR",
    type: "google-vision-ocr",
    description:
      "Extracts text from images using Google Cloud Vision OCR API",
    tags: ["Google", "OCR", "Vision", "Text Detection", "Image"],
    icon: "scan-text",
    documentation:
      "This node uses the Google Cloud Vision API to detect and extract text from images. It supports both sparse text (TEXT_DETECTION) and dense document text (DOCUMENT_TEXT_DETECTION). Requires a Google Cloud API key with the Vision API enabled.",
    referenceUrl: "https://cloud.google.com/vision/docs/ocr",
    usage: 10,
    inputs: [
      {
        name: "image",
        type: "image",
        description:
          "Image file to extract text from (PNG, JPEG, GIF, BMP, WEBP, TIFF, ICO, PDF)",
        required: true,
      },
      {
        name: "api_key",
        type: "secret",
        description: "Google Cloud Vision API key",
        required: true,
      },
      {
        name: "detection_type",
        type: "string",
        description:
          "Detection type: TEXT_DETECTION for sparse text, DOCUMENT_TEXT_DETECTION for dense documents",
        value: "DOCUMENT_TEXT_DETECTION",
      },
      {
        name: "language_hints",
        type: "string",
        description:
          "Comma-separated BCP-47 language codes to hint the OCR engine (e.g. en,fr,de)",
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "The full extracted text from the image",
      },
      {
        name: "blocks",
        type: "json",
        description:
          "Structured text annotations array with bounding boxes",
      },
      {
        name: "language",
        type: "string",
        description: "Detected language code of the text",
        hidden: true,
      },
      {
        name: "confidence",
        type: "number",
        description: "Overall confidence score of the detection (0-1)",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { image, api_key, detection_type, language_hints } =
        context.inputs;

      // Validate required inputs
      if (!image) {
        return this.createErrorResult("Missing required input: image");
      }

      if (
        !image.data ||
        !(image.data instanceof Uint8Array) ||
        !image.mimeType
      ) {
        return this.createErrorResult(
          "Invalid image input: expected image with data and mimeType"
        );
      }

      if (!api_key) {
        return this.createErrorResult("Missing required input: api_key");
      }

      // Resolve the secret value
      const apiKeyValue = context.getSecret
        ? await context.getSecret(api_key)
        : undefined;

      if (!apiKeyValue) {
        return this.createErrorResult(
          `Could not resolve API key secret: ${api_key}`
        );
      }

      // Validate detection type
      const validTypes = ["TEXT_DETECTION", "DOCUMENT_TEXT_DETECTION"];
      const featureType = detection_type || "DOCUMENT_TEXT_DETECTION";
      if (!validTypes.includes(featureType)) {
        return this.createErrorResult(
          `Invalid detection_type: expected TEXT_DETECTION or DOCUMENT_TEXT_DETECTION, got ${featureType}`
        );
      }

      // Encode image to base64
      const imageBase64 = Buffer.from(image.data).toString("base64");

      // Build the request body
      const imageContext: Record<string, string[]> = {};
      if (language_hints && typeof language_hints === "string") {
        imageContext.languageHints = language_hints
          .split(",")
          .map((lang: string) => lang.trim())
          .filter((lang: string) => lang.length > 0);
      }

      const requestBody = {
        requests: [
          {
            image: {
              content: imageBase64,
            },
            features: [
              {
                type: featureType,
              },
            ],
            ...(Object.keys(imageContext).length > 0 && { imageContext }),
          },
        ],
      };

      // Call the Vision API
      const response = await fetch(`${VISION_API_URL}?key=${apiKeyValue}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return this.createErrorResult(
          `Google Vision API error (${response.status}): ${errorText}`
        );
      }

      const data = (await response.json()) as VisionAnnotateResponse;

      if (!data.responses || data.responses.length === 0) {
        return this.createErrorResult(
          "Empty response from Google Vision API"
        );
      }

      const annotationResponse = data.responses[0];

      // Check for API-level errors in the response
      if (annotationResponse.error) {
        return this.createErrorResult(
          `Google Vision API error: ${annotationResponse.error.message}`
        );
      }

      // Extract full text from fullTextAnnotation (preferred) or textAnnotations
      let fullText = "";
      if (annotationResponse.fullTextAnnotation) {
        fullText = annotationResponse.fullTextAnnotation.text;
      } else if (
        annotationResponse.textAnnotations &&
        annotationResponse.textAnnotations.length > 0
      ) {
        // The first textAnnotation contains the full detected text
        fullText = annotationResponse.textAnnotations[0].description;
      }

      // Build structured blocks from individual text annotations (skip first which is the full text)
      const blocks =
        annotationResponse.textAnnotations &&
        annotationResponse.textAnnotations.length > 1
          ? annotationResponse.textAnnotations.slice(1).map((annotation) => ({
              text: annotation.description,
              boundingPoly: annotation.boundingPoly,
            }))
          : [];

      // Extract detected language and confidence from fullTextAnnotation
      let language = "";
      let confidence = 0;

      if (annotationResponse.fullTextAnnotation?.pages?.[0]) {
        const page = annotationResponse.fullTextAnnotation.pages[0];
        if (
          page.property?.detectedLanguages &&
          page.property.detectedLanguages.length > 0
        ) {
          language = page.property.detectedLanguages[0].languageCode;
          confidence = page.property.detectedLanguages[0].confidence ?? 0;
        }
        // Use page-level confidence if available and higher
        if (page.confidence !== undefined && page.confidence > confidence) {
          confidence = page.confidence;
        }
      }

      return this.createSuccessResult({
        text: fullText,
        blocks,
        language,
        confidence,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? `Google Vision OCR error: ${error.message}`
          : "Unknown error in Google Vision OCR"
      );
    }
  }
}
