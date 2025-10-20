/**
 * Widget Registry
 *
 * This file imports all widgets and registers them with the global registry.
 * Import this file once in your application to make all widgets available.
 */

// Import all widgets
import { audioRecorderWidget } from "./audio-recorder";
import { canvasDoodleWidget } from "./canvas-doodle";
import { datasetSelectorWidget } from "./dataset-selector";
import { documentWidget } from "./document";
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
import { numberInputWidget } from "./number-input";
import { registry } from "./registry";
import { sliderWidget } from "./slider";
import { textAreaWidget } from "./text-area";
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

  // Complex widgets
  webcamWidget,
  audioRecorderWidget,
  canvasDoodleWidget,
  documentWidget,

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
