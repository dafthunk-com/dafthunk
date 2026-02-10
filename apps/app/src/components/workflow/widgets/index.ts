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
// Output widgets
import { audioOutputWidget } from "./output/audio-output";
import { blobOutputWidget } from "./output/blob-output";
import { booleanOutputWidget } from "./output/boolean-output";
import { buffergeometryOutputWidget } from "./output/buffergeometry-output";
import { dateOutputWidget } from "./output/date-output";
import { documentOutputWidget } from "./output/document-output";
import { geojsonOutputWidget } from "./output/geojson-output";
import { gltfOutputWidget } from "./output/gltf-output";
import { imageOutputWidget } from "./output/image-output";
import { jsonOutputWidget } from "./output/json-output";
import { numberOutputWidget } from "./output/number-output";
import { secretOutputWidget } from "./output/secret-output";
import { textOutputWidget } from "./output/text-output";
import { registry } from "./registry";

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

  // Output widgets
  textOutputWidget,
  numberOutputWidget,
  booleanOutputWidget,
  dateOutputWidget,
  secretOutputWidget,
  blobOutputWidget,
  imageOutputWidget,
  documentOutputWidget,
  audioOutputWidget,
  gltfOutputWidget,
  buffergeometryOutputWidget,
  jsonOutputWidget,
  geojsonOutputWidget,
];

widgets.forEach((widget) => registry.register(widget));

// Export the registry for use in components
export { registry };
