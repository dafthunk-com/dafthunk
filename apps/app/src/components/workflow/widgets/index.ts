/**
 * Widget Registry
 *
 * This file imports all widgets and registers them with the global registry.
 * Import this file once in your application to make all widgets available.
 */

// Input widgets
import { audioInputWidget } from "./audio-input";
// Preview widgets
import { audioPreviewWidget } from "./audio-preview";
import { blobPreviewWidget } from "./blob-preview";
import { booleanInputWidget } from "./boolean-input";
import { booleanPreviewWidget } from "./boolean-preview";
import { buffergeometryPreviewWidget } from "./buffergeometry-preview";
import { canvasInputWidget } from "./canvas-input";
import { cronInputWidget } from "./cron-input";
// Selector widgets
import { databaseSelectorWidget } from "./database-selector";
import { datasetSelectorWidget } from "./dataset-selector";
import { dateInputWidget } from "./date-input";
import { datePreviewWidget } from "./date-preview";
import { documentPreviewWidget } from "./document-preview";
import { emailSelectorWidget } from "./email-selector";
import { fileInputWidget } from "./file-input";
import { geojsonPreviewWidget } from "./geojson-preview";
import { gltfPreviewWidget } from "./gltf-preview";
import { imagePreviewWidget } from "./image-preview";
// Integration widgets
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
import { javascriptInputWidget } from "./javascript-input";
import { jsonInputWidget } from "./json-input";
import { jsonPreviewWidget } from "./json-preview";
import { numberInputWidget } from "./number-input";
import { numberPreviewWidget } from "./number-preview";
import { queueSelectorWidget } from "./queue-selector";
import { registry } from "./registry";
import { secretPreviewWidget } from "./secret-preview";
import { sliderInputWidget } from "./slider-input";
import { textInputWidget } from "./text-input";
import { textPreviewWidget } from "./text-preview";
import { webcamInputWidget } from "./webcam-input";

// Register all widgets
const widgets = [
  // Input widgets
  textInputWidget,
  numberInputWidget,
  booleanInputWidget,
  dateInputWidget,
  jsonInputWidget,
  javascriptInputWidget,
  sliderInputWidget,
  cronInputWidget,
  fileInputWidget,
  webcamInputWidget,
  audioInputWidget,
  canvasInputWidget,

  // Preview widgets
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

  // Selector widgets
  datasetSelectorWidget,
  databaseSelectorWidget,
  queueSelectorWidget,
  emailSelectorWidget,

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
