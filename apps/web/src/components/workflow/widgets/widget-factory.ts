import { WorkflowParameter } from "../workflow-types";

export interface SliderWidgetConfig {
  type: "slider";
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface TextAreaWidgetConfig {
  type: "text-area";
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  rows: number;
}

export interface InputTextWidgetConfig {
  type: "input-text";
  id: string;
  name: string;
  value: string;
  placeholder?: string;
}

export interface NumberInputWidgetConfig {
  type: "number-input";
  id: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface JsonEditorWidgetConfig {
  type: "json-editor";
  id: string;
  name: string;
  value: string;
}

export interface JavaScriptEditorWidgetConfig {
  type: "javascript-editor";
  id: string;
  name: string;
  value: string;
}

interface CanvasDoodleConfig {
  type: "canvas-doodle";
  value: string;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
}

interface WebcamConfig {
  type: "webcam";
  value: string;
  width: number;
  height: number;
}

interface AudioRecorderConfig {
  type: "audio-recorder";
  value: string;
  sampleRate: number;
  channels: number;
}

interface DocumentConfig {
  type: "document";
  value: string;
  mimeType: string;
}

interface DatasetSelectorConfig {
  type: "dataset-selector";
  id: string;
  name: string;
  value: string;
}

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
  | DatasetSelectorConfig;

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
    default:
      return null;
  }
}
