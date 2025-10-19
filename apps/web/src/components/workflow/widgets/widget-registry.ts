import type * as React from "react";

import type { WorkflowParameter } from "../workflow-types";
import { AudioRecorderWidget, AudioRecorderWidgetMeta } from "./audio-recorder-widget";
import type { AudioRecorderConfig } from "./audio-recorder-widget";
import { CanvasDoodleWidget, CanvasDoodleWidgetMeta } from "./canvas-doodle-widget";
import type { CanvasDoodleConfig } from "./canvas-doodle-widget";
import { DatasetSelectorWidget, DatasetSelectorWidgetMeta } from "./dataset-selector-widget";
import type { DatasetSelectorConfig } from "./dataset-selector-widget";
import { DocumentWidget, DocumentWidgetMeta } from "./document-widget";
import type { DocumentConfig } from "./document-widget";
import { InputTextWidget, InputTextWidgetMeta } from "./input-text-widget";
import type { InputTextWidgetConfig } from "./input-text-widget";
import {
  createIntegrationSelectorMeta,
  IntegrationSelectorWidget,
} from "./integration-selector-widget";
import type { IntegrationSelectorConfig } from "./integration-selector-widget";
import {
  JavaScriptEditorWidget,
  JavaScriptEditorWidgetMeta,
} from "./javascript-editor-widget";
import type { JavaScriptEditorWidgetConfig } from "./javascript-editor-widget";
import { JsonEditorWidget, JsonEditorWidgetMeta } from "./json-editor-widget";
import type { JsonEditorWidgetConfig } from "./json-editor-widget";
import { NumberInputWidget, NumberInputWidgetMeta } from "./number-input-widget";
import type { NumberInputWidgetConfig } from "./number-input-widget";
import { SliderWidget, SliderWidgetMeta } from "./slider-widget";
import type { SliderWidgetConfig } from "./slider-widget";
import { TextAreaWidget, TextAreaWidgetMeta } from "./text-area-widget";
import type { TextAreaWidgetConfig } from "./text-area-widget";
import { WebcamWidget, WebcamWidgetMeta } from "./webcam-widget";
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

/**
 * Get the widget component for a given node type
 */
export function getWidgetComponent(nodeType: string): React.FC<any> | undefined {
  switch (nodeType) {
    case "slider":
      return SliderWidget;
    case "text-area":
      return TextAreaWidget;
    case "input-text":
      return InputTextWidget;
    case "number-input":
      return NumberInputWidget;
    case "json-editor":
      return JsonEditorWidget;
    case "javascript-editor":
      return JavaScriptEditorWidget;
    case "canvas-doodle":
      return CanvasDoodleWidget;
    case "webcam":
      return WebcamWidget;
    case "audio-recorder":
      return AudioRecorderWidget;
    case "document":
      return DocumentWidget;
    case "rag-ai-search":
    case "rag-search":
      return DatasetSelectorWidget;
    // Google Mail
    case "send-email-google-mail":
    case "read-inbox-google-mail":
    case "create-reply-draft-google-mail":
    case "check-draft-google-mail":
    case "send-draft-google-mail":
    case "delete-draft-google-mail":
    case "update-draft-google-mail":
    case "mark-message-google-mail":
    case "modify-labels-google-mail":
    case "search-messages-google-mail":
    case "get-message-google-mail":
    case "archive-message-google-mail":
    case "trash-message-google-mail":
    // Google Calendar
    case "create-event-google-calendar":
    case "list-events-google-calendar":
    case "get-event-google-calendar":
    case "update-event-google-calendar":
    case "delete-event-google-calendar":
    case "search-events-google-calendar":
    case "add-attendees-google-calendar":
    case "check-availability-google-calendar":
    case "quick-add-google-calendar":
    case "list-calendars-google-calendar":
    // Discord
    case "send-message-discord":
    case "send-dm-discord":
    case "get-channel-discord":
    case "list-guild-channels-discord":
    case "get-guild-discord":
    case "list-user-guilds-discord":
    case "add-reaction-discord":
    // Reddit
    case "submit-post-reddit":
    case "submit-comment-reddit":
    case "get-subreddit-reddit":
    case "get-user-reddit":
    case "list-posts-reddit":
    case "vote-reddit":
    // LinkedIn
    case "share-post-linkedin":
    case "get-profile-linkedin":
    case "comment-on-post-linkedin":
    case "like-post-linkedin":
    case "get-post-comments-linkedin":
    case "get-post-likes-linkedin":
    case "get-member-profile-linkedin":
    case "get-organization-linkedin":
    // GitHub
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
    case "list-organization-repositories-github":
    // OpenAI
    case "gpt-41":
    case "gpt-5":
    case "gpt-5-mini":
    case "gpt-5-nano":
    // Anthropic
    case "claude-3-opus":
    case "claude-35-haiku":
    case "claude-35-sonnet":
    case "claude-37-sonnet":
    case "claude-opus-4":
    case "claude-opus-41":
    case "claude-sonnet-4":
    // Gemini
    case "gemini-2-5-flash":
    case "gemini-2-5-pro":
    case "gemini-2-5-flash-image-preview":
    case "gemini-2-5-flash-audio-understanding":
    case "gemini-2-5-flash-image-understanding":
    case "gemini-2-5-flash-tts":
    case "imagen":
      return IntegrationSelectorWidget;
    default:
      return undefined;
  }
}

/**
 * Get the input field ID that a widget should update
 */
export function getWidgetInputField(nodeType: string): string {
  switch (nodeType) {
    case "slider":
      return SliderWidgetMeta.inputField;
    case "text-area":
      return TextAreaWidgetMeta.inputField;
    case "input-text":
      return InputTextWidgetMeta.inputField;
    case "number-input":
      return NumberInputWidgetMeta.inputField;
    case "json-editor":
      return JsonEditorWidgetMeta.inputField;
    case "javascript-editor":
      return JavaScriptEditorWidgetMeta.inputField;
    case "canvas-doodle":
      return CanvasDoodleWidgetMeta.inputField;
    case "webcam":
      return WebcamWidgetMeta.inputField;
    case "audio-recorder":
      return AudioRecorderWidgetMeta.inputField;
    case "document":
      return DocumentWidgetMeta.inputField;
    case "rag-ai-search":
    case "rag-search":
      return DatasetSelectorWidgetMeta.inputField;
    // All integration nodes use integrationId
    default:
      return "integrationId";
  }
}

/**
 * Create widget config for a given node
 */
export function createWidgetConfig(
  nodeId: string,
  inputs: WorkflowParameter[],
  type: string
): WidgetConfig | null {
  switch (type) {
    case "slider":
      return SliderWidgetMeta.createConfig(nodeId, inputs);
    case "text-area":
      return TextAreaWidgetMeta.createConfig(nodeId, inputs);
    case "input-text":
      return InputTextWidgetMeta.createConfig(nodeId, inputs);
    case "number-input":
      return NumberInputWidgetMeta.createConfig(nodeId, inputs);
    case "json-editor":
      return JsonEditorWidgetMeta.createConfig(nodeId, inputs);
    case "javascript-editor":
      return JavaScriptEditorWidgetMeta.createConfig(nodeId, inputs);
    case "canvas-doodle":
      return CanvasDoodleWidgetMeta.createConfig(nodeId, inputs);
    case "webcam":
      return WebcamWidgetMeta.createConfig(nodeId, inputs);
    case "audio-recorder":
      return AudioRecorderWidgetMeta.createConfig(nodeId, inputs);
    case "document":
      return DocumentWidgetMeta.createConfig(nodeId, inputs);
    case "rag-ai-search":
    case "rag-search":
      return DatasetSelectorWidgetMeta.createConfig(nodeId, inputs);
    // Google Mail
    case "send-email-google-mail":
    case "read-inbox-google-mail":
    case "create-reply-draft-google-mail":
    case "check-draft-google-mail":
    case "send-draft-google-mail":
    case "delete-draft-google-mail":
    case "update-draft-google-mail":
    case "mark-message-google-mail":
    case "modify-labels-google-mail":
    case "search-messages-google-mail":
    case "get-message-google-mail":
    case "archive-message-google-mail":
    case "trash-message-google-mail":
      return createIntegrationSelectorMeta([], "google-mail").createConfig(nodeId, inputs);
    // Google Calendar
    case "create-event-google-calendar":
    case "list-events-google-calendar":
    case "get-event-google-calendar":
    case "update-event-google-calendar":
    case "delete-event-google-calendar":
    case "search-events-google-calendar":
    case "add-attendees-google-calendar":
    case "check-availability-google-calendar":
    case "quick-add-google-calendar":
    case "list-calendars-google-calendar":
      return createIntegrationSelectorMeta([], "google-calendar").createConfig(nodeId, inputs);
    // Discord
    case "send-message-discord":
    case "send-dm-discord":
    case "get-channel-discord":
    case "list-guild-channels-discord":
    case "get-guild-discord":
    case "list-user-guilds-discord":
    case "add-reaction-discord":
      return createIntegrationSelectorMeta([], "discord").createConfig(nodeId, inputs);
    // Reddit
    case "submit-post-reddit":
    case "submit-comment-reddit":
    case "get-subreddit-reddit":
    case "get-user-reddit":
    case "list-posts-reddit":
    case "vote-reddit":
      return createIntegrationSelectorMeta([], "reddit").createConfig(nodeId, inputs);
    // LinkedIn
    case "share-post-linkedin":
    case "get-profile-linkedin":
    case "comment-on-post-linkedin":
    case "like-post-linkedin":
    case "get-post-comments-linkedin":
    case "get-post-likes-linkedin":
    case "get-member-profile-linkedin":
    case "get-organization-linkedin":
      return createIntegrationSelectorMeta([], "linkedin").createConfig(nodeId, inputs);
    // GitHub
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
    case "list-organization-repositories-github":
      return createIntegrationSelectorMeta([], "github").createConfig(nodeId, inputs);
    // OpenAI
    case "gpt-41":
    case "gpt-5":
    case "gpt-5-mini":
    case "gpt-5-nano":
      return createIntegrationSelectorMeta([], "openai").createConfig(nodeId, inputs);
    // Anthropic
    case "claude-3-opus":
    case "claude-35-haiku":
    case "claude-35-sonnet":
    case "claude-37-sonnet":
    case "claude-opus-4":
    case "claude-opus-41":
    case "claude-sonnet-4":
      return createIntegrationSelectorMeta([], "anthropic").createConfig(nodeId, inputs);
    // Gemini
    case "gemini-2-5-flash":
    case "gemini-2-5-pro":
    case "gemini-2-5-flash-image-preview":
    case "gemini-2-5-flash-audio-understanding":
    case "gemini-2-5-flash-image-understanding":
    case "gemini-2-5-flash-tts":
    case "imagen":
      return createIntegrationSelectorMeta([], "gemini").createConfig(nodeId, inputs);
    default:
      return null;
  }
}
