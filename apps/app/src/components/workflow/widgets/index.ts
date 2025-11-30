/**
 * Widget Registry
 *
 * This file imports all widgets and registers them with the global registry.
 * Import this file once in your application to make all widgets available.
 */

// Import all widgets
import { audioPreviewWidget } from "./audio-preview";
import { audioRecorderWidget } from "./audio-recorder";
import { blobPreviewWidget } from "./blob-preview";
import { booleanPreviewWidget } from "./boolean-preview";
import { buffergeometryPreviewWidget } from "./buffergeometry-preview";
import { canvasDoodleWidget } from "./canvas-doodle";
import { cronExpressionWidget } from "./cron-expression";
import { databaseSelectorWidget } from "./database-selector";
import { datasetSelectorWidget } from "./dataset-selector";
import { datePreviewWidget } from "./date-preview";
import { documentPreviewWidget } from "./document-preview";
import { emailSelectorWidget } from "./email-selector";
import { fileWidget } from "./file";
import { geojsonPreviewWidget } from "./geojson-preview";
import { gltfPreviewWidget } from "./gltf-preview";
import { imagePreviewWidget } from "./image-preview";
import { inputTextWidget } from "./input-text";
import {
  anthropicWidget,
  discordWidget,
  geminiWidget,
  githubWidget,
  googleCalendarWidget,
  googleMailWidget,
  linkedInWidget,
  openaiWidget,
  redditWidget,
} from "./integration-selector";
import { javascriptEditorWidget } from "./javascript-editor";
import { jsonEditorWidget } from "./json-editor";
import { jsonPreviewWidget } from "./json-preview";
import { numberInputWidget } from "./number-input";
import { numberPreviewWidget } from "./number-preview";
import { queueSelectorWidget } from "./queue-selector";
import { registry } from "./registry";
import { secretPreviewWidget } from "./secret-preview";
import { sliderWidget } from "./slider";
import { textAreaWidget } from "./text-area";
import { textPreviewWidget } from "./text-preview";
import { webcamWidget } from "./webcam";

// Register all widgets
const widgets = [
  // Simple widgets
  sliderWidget,
  textAreaWidget,
  inputTextWidget,
  numberInputWidget,
  jsonEditorWidget,
  javascriptEditorWidget,
  datasetSelectorWidget,
  databaseSelectorWidget,
  queueSelectorWidget,
  emailSelectorWidget,
  cronExpressionWidget,

  // Preview/Display widgets
  textPreviewWidget,
  numberPreviewWidget,
  booleanPreviewWidget,
  datePreviewWidget,
  secretPreviewWidget,
  blobPreviewWidget,
  imagePreviewWidget,
  documentPreviewWidget,
  audioPreviewWidget,
  gltfPreviewWidget,
  buffergeometryPreviewWidget,
  jsonPreviewWidget,
  geojsonPreviewWidget,

  // Complex widgets
  webcamWidget,
  audioRecorderWidget,
  canvasDoodleWidget,
  fileWidget,

  // Integration widgets
  googleMailWidget,
  googleCalendarWidget,
  discordWidget,
  redditWidget,
  linkedInWidget,
  githubWidget,
  openaiWidget,
  anthropicWidget,
  geminiWidget,
];

widgets.forEach((widget) => registry.register(widget));

// Export the registry for use in components
export { registry };
