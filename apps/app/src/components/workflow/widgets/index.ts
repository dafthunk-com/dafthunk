/**
 * Widget Registry
 *
 * This file imports all widgets and registers them with the global registry.
 * Import this file once in your application to make all widgets available.
 */

// Input widgets
import { audioInputWidget } from "./input/audio-input";
import { audioRecorderInputWidget } from "./input/audio-recorder-input";
import { blobInputWidget } from "./input/blob-input";
import { booleanInputWidget } from "./input/boolean-input";
import { canvasInputWidget } from "./input/canvas-input";
import { cronInputWidget } from "./input/cron-input";
import { dateInputWidget } from "./input/date-input";
import { documentInputWidget } from "./input/document-input";
import { fileInputWidget } from "./input/file-input";
import { geojsonInputWidget } from "./input/geojson-input";
import { gltfInputWidget } from "./input/gltf-input";
import { imageInputWidget } from "./input/image-input";
import { javascriptInputWidget } from "./input/javascript-input";
import { jsonInputWidget } from "./input/json-input";
import { numberInputWidget } from "./input/number-input";
import { secretInputWidget } from "./input/secret-input";
import { sliderInputWidget } from "./input/slider-input";
import { textInputWidget } from "./input/text-input";
import { webcamInputWidget } from "./input/webcam-input";
// Preview widgets
import { audioPreviewWidget } from "./preview/audio-preview";
import { blobPreviewWidget } from "./preview/blob-preview";
import { booleanPreviewWidget } from "./preview/boolean-preview";
import { buffergeometryPreviewWidget } from "./preview/buffergeometry-preview";
import { datePreviewWidget } from "./preview/date-preview";
import { documentPreviewWidget } from "./preview/document-preview";
import { geojsonPreviewWidget } from "./preview/geojson-preview";
import { gltfPreviewWidget } from "./preview/gltf-preview";
import { imagePreviewWidget } from "./preview/image-preview";
import { jsonPreviewWidget } from "./preview/json-preview";
import { numberPreviewWidget } from "./preview/number-preview";
import { secretPreviewWidget } from "./preview/secret-preview";
import { textPreviewWidget } from "./preview/text-preview";
import { registry } from "./registry";
// Selector widgets
import { databaseSelectorWidget } from "./selector/database-selector";
import { datasetSelectorWidget } from "./selector/dataset-selector";
import { emailSelectorWidget } from "./selector/email-selector";
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
} from "./selector/integration-selector";
import { queueSelectorWidget } from "./selector/queue-selector";

// Register all widgets
const widgets = [
  // Simple input widgets (one per parameter type)
  textInputWidget,
  numberInputWidget,
  booleanInputWidget,
  dateInputWidget,
  jsonInputWidget,
  imageInputWidget,
  blobInputWidget,
  audioInputWidget,
  documentInputWidget,
  gltfInputWidget,
  geojsonInputWidget,
  secretInputWidget,

  // Advanced input widgets (special UX)
  javascriptInputWidget,
  sliderInputWidget,
  cronInputWidget,
  fileInputWidget,
  webcamInputWidget,
  audioRecorderInputWidget,
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
