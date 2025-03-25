import { Parameter } from "../workflow-node";

export interface SliderWidgetConfig {
  type: "slider";
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface RadioGroupWidgetConfig {
  type: "radio-group";
  id: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}

export interface TextAreaWidgetConfig {
  type: "text-area";
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  rows: number;
}

export type WidgetConfig = SliderWidgetConfig | RadioGroupWidgetConfig | TextAreaWidgetConfig;

export function createWidgetConfig(
  nodeId: string,
  inputs: Parameter[],
  nodeType: string
): WidgetConfig | null {
  switch (nodeType) {
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
    case "radio-group": {
      const optionsInput = inputs.find((i) => i.id === "options");
      let options: Array<{ value: string; label: string }> = [];

      // Handle different possible formats of the options input
      if (optionsInput?.value) {
        if (Array.isArray(optionsInput.value)) {
          options = optionsInput.value;
        } else if (typeof optionsInput.value === "string") {
          try {
            const parsed = JSON.parse(optionsInput.value);
            if (Array.isArray(parsed)) {
              options = parsed;
            }
          } catch (e) {
            console.warn("Failed to parse options JSON string");
          }
        }
      }

      // Ensure we have at least one default option
      if (options.length === 0) {
        options = [{ value: "option1", label: "Option 1" }];
      }

      return {
        type: "radio-group",
        id: nodeId,
        name: "Radio Group",
        value: (inputs.find((i) => i.id === "value")?.value as string) || options[0].value,
        options,
      };
    }
    case "text-area": {
      const valueInput = inputs.find((i) => i.id === "value");
      const placeholderInput = inputs.find((i) => i.id === "placeholder");
      const rowsInput = inputs.find((i) => i.id === "rows");

      // Ensure required inputs are present
      if (!valueInput || !rowsInput) {
        console.warn(`Missing required inputs for text area widget in node ${nodeId}`);
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
    default:
      return null;
  }
} 