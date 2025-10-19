import type * as React from "react";

import type { WorkflowParameter } from "../workflow-types";
import { AudioRecorderWidget } from "./audio-recorder-widget";
import type { AudioRecorderConfig } from "./audio-recorder-widget";
import { CanvasDoodleWidget } from "./canvas-doodle-widget";
import type { CanvasDoodleConfig } from "./canvas-doodle-widget";
import { DatasetSelectorWidget } from "./dataset-selector-widget";
import type { DatasetSelectorConfig } from "./dataset-selector-widget";
import { DocumentWidget } from "./document-widget";
import type { DocumentConfig } from "./document-widget";
import { InputTextWidget } from "./input-text-widget";
import type { InputTextWidgetConfig } from "./input-text-widget";
import { IntegrationSelectorWidget } from "./integration-selector-widget";
import type { IntegrationSelectorConfig } from "./integration-selector-widget";
import { JavaScriptEditorWidget } from "./javascript-editor-widget";
import type { JavaScriptEditorWidgetConfig } from "./javascript-editor-widget";
import { JsonEditorWidget } from "./json-editor-widget";
import type { JsonEditorWidgetConfig } from "./json-editor-widget";
import { NumberInputWidget } from "./number-input-widget";
import type { NumberInputWidgetConfig } from "./number-input-widget";
import { SliderWidget } from "./slider-widget";
import type { SliderWidgetConfig } from "./slider-widget";
import { TextAreaWidget } from "./text-area-widget";
import type { TextAreaWidgetConfig } from "./text-area-widget";
import { WebcamWidget } from "./webcam-widget";
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

// Widget component mapping
const widgetComponents: Record<
  string,
  React.FC<{
    config: any;
    onChange: (value: any) => void;
    compact?: boolean;
    readonly?: boolean;
  }>
> = {
  slider: SliderWidget,
  "text-area": TextAreaWidget,
  "input-text": InputTextWidget,
  "number-input": NumberInputWidget,
  "json-editor": JsonEditorWidget,
  "javascript-editor": JavaScriptEditorWidget,
  "canvas-doodle": CanvasDoodleWidget,
  webcam: WebcamWidget,
  "audio-recorder": AudioRecorderWidget,
  document: DocumentWidget,
  "rag-ai-search": DatasetSelectorWidget,
  "rag-search": DatasetSelectorWidget,
  "send-email-google-mail": IntegrationSelectorWidget,
  "read-inbox-google-mail": IntegrationSelectorWidget,
  "create-reply-draft-google-mail": IntegrationSelectorWidget,
  "check-draft-google-mail": IntegrationSelectorWidget,
  "send-draft-google-mail": IntegrationSelectorWidget,
  "delete-draft-google-mail": IntegrationSelectorWidget,
  "update-draft-google-mail": IntegrationSelectorWidget,
  "mark-message-google-mail": IntegrationSelectorWidget,
  "modify-labels-google-mail": IntegrationSelectorWidget,
  "search-messages-google-mail": IntegrationSelectorWidget,
  "get-message-google-mail": IntegrationSelectorWidget,
  "archive-message-google-mail": IntegrationSelectorWidget,
  "trash-message-google-mail": IntegrationSelectorWidget,
  "create-event-google-calendar": IntegrationSelectorWidget,
  "list-events-google-calendar": IntegrationSelectorWidget,
  "get-event-google-calendar": IntegrationSelectorWidget,
  "update-event-google-calendar": IntegrationSelectorWidget,
  "delete-event-google-calendar": IntegrationSelectorWidget,
  "search-events-google-calendar": IntegrationSelectorWidget,
  "add-attendees-google-calendar": IntegrationSelectorWidget,
  "check-availability-google-calendar": IntegrationSelectorWidget,
  "quick-add-google-calendar": IntegrationSelectorWidget,
  "list-calendars-google-calendar": IntegrationSelectorWidget,
  "send-message-discord": IntegrationSelectorWidget,
  "send-dm-discord": IntegrationSelectorWidget,
  "get-channel-discord": IntegrationSelectorWidget,
  "list-guild-channels-discord": IntegrationSelectorWidget,
  "get-guild-discord": IntegrationSelectorWidget,
  "list-user-guilds-discord": IntegrationSelectorWidget,
  "add-reaction-discord": IntegrationSelectorWidget,
  "submit-post-reddit": IntegrationSelectorWidget,
  "submit-comment-reddit": IntegrationSelectorWidget,
  "get-subreddit-reddit": IntegrationSelectorWidget,
  "get-user-reddit": IntegrationSelectorWidget,
  "list-posts-reddit": IntegrationSelectorWidget,
  "vote-reddit": IntegrationSelectorWidget,
  "share-post-linkedin": IntegrationSelectorWidget,
  "get-profile-linkedin": IntegrationSelectorWidget,
  "comment-on-post-linkedin": IntegrationSelectorWidget,
  "like-post-linkedin": IntegrationSelectorWidget,
  "get-post-comments-linkedin": IntegrationSelectorWidget,
  "get-post-likes-linkedin": IntegrationSelectorWidget,
  "get-member-profile-linkedin": IntegrationSelectorWidget,
  "get-organization-linkedin": IntegrationSelectorWidget,
  "get-repository-github": IntegrationSelectorWidget,
  "get-user-github": IntegrationSelectorWidget,
  "search-repositories-github": IntegrationSelectorWidget,
  "star-repository-github": IntegrationSelectorWidget,
  "unstar-repository-github": IntegrationSelectorWidget,
  "follow-user-github": IntegrationSelectorWidget,
  "unfollow-user-github": IntegrationSelectorWidget,
  "get-file-contents-github": IntegrationSelectorWidget,
  "create-update-file-github": IntegrationSelectorWidget,
  "delete-file-github": IntegrationSelectorWidget,
  "list-user-repositories-github": IntegrationSelectorWidget,
  "list-organization-repositories-github": IntegrationSelectorWidget,
  "gpt-41": IntegrationSelectorWidget,
  "gpt-5": IntegrationSelectorWidget,
  "gpt-5-mini": IntegrationSelectorWidget,
  "gpt-5-nano": IntegrationSelectorWidget,
  "claude-3-opus": IntegrationSelectorWidget,
  "claude-35-haiku": IntegrationSelectorWidget,
  "claude-35-sonnet": IntegrationSelectorWidget,
  "claude-37-sonnet": IntegrationSelectorWidget,
  "claude-opus-4": IntegrationSelectorWidget,
  "claude-opus-41": IntegrationSelectorWidget,
  "claude-sonnet-4": IntegrationSelectorWidget,
  "gemini-2-5-flash": IntegrationSelectorWidget,
  "gemini-2-5-pro": IntegrationSelectorWidget,
  "gemini-2-5-flash-image-preview": IntegrationSelectorWidget,
  "gemini-2-5-flash-audio-understanding": IntegrationSelectorWidget,
  "gemini-2-5-flash-image-understanding": IntegrationSelectorWidget,
  "gemini-2-5-flash-tts": IntegrationSelectorWidget,
  imagen: IntegrationSelectorWidget,
};

/**
 * Get the widget component for a given node type
 */
export function getWidgetComponent(nodeType: string) {
  return widgetComponents[nodeType];
}

/**
 * Get the input field ID that a widget should update
 */
export function getWidgetInputField(nodeType: string): string {
  // Dataset selector widgets
  if (nodeType === "rag-ai-search" || nodeType === "rag-search") {
    return "datasetId";
  }

  // Integration selector widgets
  if (
    // Google Mail nodes
    nodeType === "send-email-google-mail" ||
    nodeType === "read-inbox-google-mail" ||
    nodeType === "create-reply-draft-google-mail" ||
    nodeType === "check-draft-google-mail" ||
    nodeType === "send-draft-google-mail" ||
    nodeType === "delete-draft-google-mail" ||
    nodeType === "update-draft-google-mail" ||
    nodeType === "mark-message-google-mail" ||
    nodeType === "modify-labels-google-mail" ||
    nodeType === "search-messages-google-mail" ||
    nodeType === "get-message-google-mail" ||
    nodeType === "archive-message-google-mail" ||
    nodeType === "trash-message-google-mail" ||
    // Google Calendar nodes
    nodeType === "create-event-google-calendar" ||
    nodeType === "list-events-google-calendar" ||
    nodeType === "get-event-google-calendar" ||
    nodeType === "update-event-google-calendar" ||
    nodeType === "delete-event-google-calendar" ||
    nodeType === "search-events-google-calendar" ||
    nodeType === "add-attendees-google-calendar" ||
    nodeType === "check-availability-google-calendar" ||
    nodeType === "quick-add-google-calendar" ||
    nodeType === "list-calendars-google-calendar" ||
    // Discord nodes
    nodeType === "send-message-discord" ||
    nodeType === "send-dm-discord" ||
    nodeType === "get-channel-discord" ||
    nodeType === "list-guild-channels-discord" ||
    nodeType === "get-guild-discord" ||
    nodeType === "list-user-guilds-discord" ||
    nodeType === "add-reaction-discord" ||
    // Reddit nodes
    nodeType === "submit-post-reddit" ||
    nodeType === "submit-comment-reddit" ||
    nodeType === "get-subreddit-reddit" ||
    nodeType === "get-user-reddit" ||
    nodeType === "list-posts-reddit" ||
    nodeType === "vote-reddit" ||
    // LinkedIn nodes
    nodeType === "share-post-linkedin" ||
    nodeType === "get-profile-linkedin" ||
    nodeType === "comment-on-post-linkedin" ||
    nodeType === "like-post-linkedin" ||
    nodeType === "get-post-comments-linkedin" ||
    nodeType === "get-post-likes-linkedin" ||
    nodeType === "get-member-profile-linkedin" ||
    nodeType === "get-organization-linkedin" ||
    // GitHub nodes
    nodeType === "get-repository-github" ||
    nodeType === "get-user-github" ||
    nodeType === "search-repositories-github" ||
    nodeType === "star-repository-github" ||
    nodeType === "unstar-repository-github" ||
    nodeType === "follow-user-github" ||
    nodeType === "unfollow-user-github" ||
    nodeType === "get-file-contents-github" ||
    nodeType === "create-update-file-github" ||
    nodeType === "delete-file-github" ||
    nodeType === "list-user-repositories-github" ||
    nodeType === "list-organization-repositories-github" ||
    // OpenAI nodes
    nodeType === "gpt-41" ||
    nodeType === "gpt-5" ||
    nodeType === "gpt-5-mini" ||
    nodeType === "gpt-5-nano" ||
    // Anthropic nodes
    nodeType === "claude-3-opus" ||
    nodeType === "claude-35-haiku" ||
    nodeType === "claude-35-sonnet" ||
    nodeType === "claude-37-sonnet" ||
    nodeType === "claude-opus-4" ||
    nodeType === "claude-opus-41" ||
    nodeType === "claude-sonnet-4" ||
    // Gemini nodes
    nodeType === "gemini-2-5-flash" ||
    nodeType === "gemini-2-5-pro" ||
    nodeType === "gemini-2-5-flash-image-preview" ||
    nodeType === "gemini-2-5-flash-audio-understanding" ||
    nodeType === "gemini-2-5-flash-image-understanding" ||
    nodeType === "gemini-2-5-flash-tts" ||
    nodeType === "imagen"
  ) {
    return "integrationId";
  }

  // Default: most widgets use "value"
  return "value";
}
