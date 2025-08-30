import { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Gemini 2.5 Flash Image Understanding node implementation using the Google GenAI SDK
 * Analyzes and understands image content, providing description, analysis, and object detection
 */
export class Gemini25FlashImageUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-image-understanding",
    name: "Gemini 2.5 Flash Image Understanding",
    type: "gemini-2-5-flash-image-understanding",
    description:
      "Analyzes and understands image content with description, analysis, and object detection capabilities",
    tags: ["Image", "AI"],
    icon: "eye",
    documentation: `This node uses Google's Gemini 2.5 Flash model to analyze and understand image content.

## Capabilities

- **Image Description**: Generate detailed descriptions of image content
- **Object Detection**: Identify and locate objects within images
- **Visual Question Answering**: Answer questions about image content
- **Image Classification**: Categorize images by content type
- **Text Recognition**: Extract and read text from images (OCR)
- **Scene Understanding**: Analyze scenes, activities, and contexts
- **Enhanced Segmentation**: Precise object segmentation with bounding boxes and masks (Gemini 2.5)

## Usage Examples

- **Description**: "Describe what you see in this image"
- **Object Detection**: "What objects are visible in this image?"
- **Question Answering**: "What is the main subject of this image?"
- **Text Recognition**: "Read any text visible in this image"
- **Scene Analysis**: "What activity is happening in this scene?"
- **Segmentation**: "Identify and segment the people in this image"

## Supported Image Formats

- PNG, JPEG, WEBP, HEIC, HEIF
- Maximum 3,600 images per request
- Automatic tiling for large images (768x768 pixel tiles)

## Best Practices

- Use specific prompts for better results: "Describe this image in detail" vs "What's in this image?"
- For object detection, ask: "What objects can you identify in this image?"
- For text extraction, ask: "Extract all text visible in this image"
- Keep prompts focused on the specific analysis you need`,
    computeCost: 15,
    asTool: true,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "Image file to analyze (PNG, JPEG, WEBP, HEIC, HEIF)",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description:
          "Instructions for image analysis (e.g., 'Describe this image', 'What objects do you see?')",
        required: true,
        value: "Analyze this image content",
      },
      {
        name: "thinking_budget",
        type: "number",
        description:
          "Thinking budget (0-1000). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 100,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description:
          "Generated text response (description, analysis, or object detection results)",
      },
      {
        name: "finish_reason",
        type: "string",
        description:
          "Reason why the generation finished (STOP, MAX_TOKENS, etc.)",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { image, prompt, thinking_budget } = context.inputs;

      if (!context.env.GEMINI_API_KEY) {
        return this.createErrorResult("GEMINI_API_KEY is not configured");
      }

      if (!image) {
        return this.createErrorResult("Image input is required");
      }

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      const ai = new GoogleGenAI({
        apiKey: context.env.GEMINI_API_KEY,
      });

      const config: any = {};

      // Configure thinking budget if provided
      if (thinking_budget !== undefined && thinking_budget !== null) {
        config.thinkingConfig = {
          thinkingBudget: thinking_budget,
        };
      }

      // Convert image data to base64 safely
      const imageBase64 = Buffer.from(image.data).toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: image.mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        config,
      });

      // Extract response data
      if (!response?.candidates?.[0]?.content?.parts) {
        return this.createErrorResult("Invalid response from Gemini API");
      }

      const candidate = response.candidates[0];
      const content = candidate.content;
      if (!content?.parts) {
        return this.createErrorResult(
          "Invalid content structure from Gemini API"
        );
      }

      const textParts = content.parts
        .filter((part: any) => part?.text)
        .map((part: any) => part.text)
        .join("");

      if (!textParts) {
        return this.createErrorResult("No text generated in response");
      }

      return this.createSuccessResult({
        text: textParts,
        finish_reason: candidate.finishReason || "STOP",
      });
    } catch (error) {
      console.error("Gemini Image Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
