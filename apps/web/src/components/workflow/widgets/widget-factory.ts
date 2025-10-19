import type { WorkflowParameter } from "../workflow-types";
import type { AudioRecorderConfig } from "./audio-recorder-widget";
import type { CanvasDoodleConfig } from "./canvas-doodle-widget";
import type { DatasetSelectorConfig } from "./dataset-selector-widget";
import type { DocumentConfig } from "./document-widget";
import type { InputTextWidgetConfig } from "./input-text-widget";
import type { IntegrationSelectorConfig } from "./integration-selector-widget";
import type { JavaScriptEditorWidgetConfig } from "./javascript-editor-widget";
import type { JsonEditorWidgetConfig } from "./json-editor-widget";
import type { NumberInputWidgetConfig } from "./number-input-widget";
import type { SliderWidgetConfig } from "./slider-widget";
import type { TextAreaWidgetConfig } from "./text-area-widget";
import type { WebcamConfig } from "./webcam-widget";

export type {
  SliderWidgetConfig,
  TextAreaWidgetConfig,
  InputTextWidgetConfig,
  NumberInputWidgetConfig,
  JsonEditorWidgetConfig,
  JavaScriptEditorWidgetConfig,
  CanvasDoodleConfig,
  WebcamConfig,
  AudioRecorderConfig,
  DocumentConfig,
  DatasetSelectorConfig,
  IntegrationSelectorConfig,
};

export type WidgetConfig =
  | SliderWidgetConfig
  | TextAreaWidgetConfig
  | InputTextWidgetConfig
  | NumberInputWidgetConfig
  | JsonEditorWidgetConfig
  | JavaScriptEditorWidgetConfig
  | CanvasDoodleConfig
  | WebcamConfig
  | AudioRecorderConfig
  | DocumentConfig
  | DatasetSelectorConfig
  | IntegrationSelectorConfig;

export function createWidgetConfig(
  nodeId: string,
  inputs: WorkflowParameter[],
  type: string
): WidgetConfig | null {
  switch (type) {
    case "slider":
      return {
        type: "slider",
        id: nodeId,
        name: "Slider",
        value: Number(inputs.find((i) => i.id === "value")?.value) || 0,
        min: Number(inputs.find((i) => i.id === "min")?.value) || 0,
        max: Number(inputs.find((i) => i.id === "max")?.value) || 100,
        step: Number(inputs.find((i) => i.id === "step")?.value) || 1,
      };
    case "text-area": {
      const valueInput = inputs.find((i) => i.id === "value");
      const placeholderInput = inputs.find((i) => i.id === "placeholder");
      const rowsInput = inputs.find((i) => i.id === "rows");

      // Ensure required inputs are present
      if (!valueInput || !rowsInput) {
        console.warn(
          `Missing required inputs for text area widget in node ${nodeId}`
        );
        return null;
      }

      // Handle placeholder value
      let placeholder: string | undefined;
      if (placeholderInput?.value !== undefined) {
        placeholder = String(placeholderInput.value);
      }

      return {
        type: "text-area",
        id: nodeId,
        name: "Text Area",
        value: String(valueInput.value || ""),
        placeholder,
        rows: Number(rowsInput.value) || 4,
      };
    }
    case "input-text": {
      const valueInput = inputs.find((i) => i.id === "value");
      const placeholderInput = inputs.find((i) => i.id === "placeholder");

      // Ensure required inputs are present
      if (!valueInput) {
        console.warn(
          `Missing required inputs for input text widget in node ${nodeId}`
        );
        return null;
      }

      // Handle placeholder value
      let placeholder: string | undefined;
      if (placeholderInput?.value !== undefined) {
        placeholder = String(placeholderInput.value);
      }

      return {
        type: "input-text",
        id: nodeId,
        name: "Text Input",
        value: String(valueInput.value || ""),
        placeholder,
      };
    }
    case "number-input": {
      const valueInput = inputs.find((i) => i.id === "value");
      const minInput = inputs.find((i) => i.id === "min");
      const maxInput = inputs.find((i) => i.id === "max");
      const stepInput = inputs.find((i) => i.id === "step");
      const placeholderInput = inputs.find((i) => i.id === "placeholder");

      // Ensure required inputs are present
      if (!valueInput) {
        console.warn(
          `Missing required inputs for number input widget in node ${nodeId}`
        );
        return null;
      }

      // Handle optional inputs
      let min: number | undefined;
      if (minInput?.value !== undefined) {
        min = Number(minInput.value);
      }

      let max: number | undefined;
      if (maxInput?.value !== undefined) {
        max = Number(maxInput.value);
      }

      let step: number | undefined;
      if (stepInput?.value !== undefined) {
        step = Number(stepInput.value);
      }

      let placeholder: string | undefined;
      if (placeholderInput?.value !== undefined) {
        placeholder = String(placeholderInput.value);
      }

      return {
        type: "number-input",
        id: nodeId,
        name: "Number Input",
        value: Number(valueInput.value) || 0,
        min,
        max,
        step,
        placeholder,
      };
    }
    case "json-editor": {
      const valueInput = inputs.find((i) => i.id === "value");

      // Ensure required inputs are present
      if (!valueInput) {
        console.warn(
          `Missing required inputs for JSON Editor widget in node ${nodeId}`
        );
        return null;
      }

      return {
        type: "json-editor",
        id: nodeId,
        name: "JSON Editor",
        value: String(valueInput.value || "{}"),
      };
    }
    case "javascript-editor": {
      const valueInput = inputs.find((i) => i.id === "value");

      // Ensure required inputs are present
      if (!valueInput) {
        console.warn(
          `Missing required inputs for JavaScript Editor widget in node ${nodeId}`
        );
        return null;
      }

      return {
        type: "javascript-editor",
        id: nodeId,
        name: "JavaScript Editor",
        value: String(valueInput.value || "// Write your JavaScript code here"),
      };
    }
    case "canvas-doodle": {
      const value = inputs.find((i) => i.id === "value")?.value as string;
      const width = inputs.find((i) => i.id === "width")?.value as number;
      const height = inputs.find((i) => i.id === "height")?.value as number;
      const strokeColor = inputs.find((i) => i.id === "strokeColor")
        ?.value as string;
      const strokeWidth = inputs.find((i) => i.id === "strokeWidth")
        ?.value as number;

      return {
        type: "canvas-doodle",
        value: value || "",
        width: width || 400,
        height: height || 300,
        strokeColor: strokeColor || "#000000",
        strokeWidth: strokeWidth || 2,
      };
    }
    case "webcam": {
      const value = inputs.find((i) => i.id === "value")?.value as string;
      const width = inputs.find((i) => i.id === "width")?.value as number;
      const height = inputs.find((i) => i.id === "height")?.value as number;

      return {
        type: "webcam",
        value: value || "",
        width: width || 640,
        height: height || 480,
      };
    }
    case "audio-recorder": {
      const value = inputs.find((i) => i.id === "value")?.value as string;
      const sampleRate = inputs.find((i) => i.id === "sampleRate")
        ?.value as number;
      const channels = inputs.find((i) => i.id === "channels")?.value as number;

      return {
        type: "audio-recorder",
        value: value || "",
        sampleRate: sampleRate || 44100,
        channels: channels || 1,
      };
    }
    case "document": {
      const value = inputs.find((i) => i.id === "value")?.value as string;
      const mimeType = inputs.find((i) => i.id === "mimeType")?.value as string;

      return {
        type: "document",
        value: value || "",
        mimeType: mimeType || "application/pdf",
      };
    }
    case "rag-ai-search": {
      const value = inputs.find((i) => i.id === "datasetId")?.value as string;

      return {
        type: "dataset-selector",
        id: nodeId,
        name: "Dataset Selector",
        value: value || "",
      };
    }
    case "rag-search": {
      const value = inputs.find((i) => i.id === "datasetId")?.value as string;

      return {
        type: "dataset-selector",
        id: nodeId,
        name: "Dataset Selector",
        value: value || "",
      };
    }
    case "send-email-google-mail": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "google-mail",
      };
    }
    case "read-inbox-google-mail": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "google-mail",
      };
    }
    case "create-reply-draft-google-mail": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "google-mail",
      };
    }
    case "check-draft-google-mail":
    case "send-draft-google-mail":
    case "delete-draft-google-mail":
    case "update-draft-google-mail":
    case "mark-message-google-mail":
    case "modify-labels-google-mail":
    case "search-messages-google-mail":
    case "get-message-google-mail":
    case "archive-message-google-mail":
    case "trash-message-google-mail": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "google-mail",
      };
    }
    case "create-event-google-calendar":
    case "list-events-google-calendar":
    case "get-event-google-calendar":
    case "update-event-google-calendar":
    case "delete-event-google-calendar":
    case "search-events-google-calendar":
    case "add-attendees-google-calendar":
    case "check-availability-google-calendar":
    case "quick-add-google-calendar":
    case "list-calendars-google-calendar": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "google-calendar",
      };
    }
    case "send-message-discord":
    case "send-dm-discord":
    case "get-channel-discord":
    case "list-guild-channels-discord":
    case "get-guild-discord":
    case "list-user-guilds-discord":
    case "add-reaction-discord": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "discord",
      };
    }
    // Reddit nodes
    case "submit-post-reddit":
    case "submit-comment-reddit":
    case "get-subreddit-reddit":
    case "get-user-reddit":
    case "list-posts-reddit":
    case "vote-reddit": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "reddit",
      };
    }
    // LinkedIn nodes
    case "share-post-linkedin":
    case "get-profile-linkedin":
    case "comment-on-post-linkedin":
    case "like-post-linkedin":
    case "get-post-comments-linkedin":
    case "get-post-likes-linkedin":
    case "get-member-profile-linkedin":
    case "get-organization-linkedin": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "linkedin",
      };
    }
    // GitHub nodes
    case "get-repository-github":
    case "get-user-github":
    case "search-repositories-github":
    case "star-repository-github":
    case "unstar-repository-github":
    case "follow-user-github":
    case "unfollow-user-github":
    case "get-file-contents-github":
    case "create-update-file-github":
    case "delete-file-github":
    case "list-user-repositories-github":
    case "list-organization-repositories-github": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "github",
      };
    }
    // OpenAI nodes
    case "gpt-41":
    case "gpt-5":
    case "gpt-5-mini":
    case "gpt-5-nano": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "openai",
      };
    }
    // Anthropic nodes
    case "claude-3-opus":
    case "claude-35-haiku":
    case "claude-35-sonnet":
    case "claude-37-sonnet":
    case "claude-opus-4":
    case "claude-opus-41":
    case "claude-sonnet-4": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "anthropic",
      };
    }
    // Gemini nodes
    case "gemini-2-5-flash":
    case "gemini-2-5-pro":
    case "gemini-2-5-flash-image-preview":
    case "gemini-2-5-flash-audio-understanding":
    case "gemini-2-5-flash-image-understanding":
    case "gemini-2-5-flash-tts":
    case "imagen": {
      const value = inputs.find((i) => i.id === "integrationId")
        ?.value as string;

      return {
        type: "integration-selector",
        id: nodeId,
        name: "Integration Selector",
        value: value || "",
        provider: "gemini",
      };
    }
    default:
      return null;
  }
}
