import { Parameter } from "../workflow-node";
import { RadioOption } from "./radio-group-widget";

export interface SliderWidgetConfig {
  type: 'slider';
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface RadioGroupWidgetConfig {
  value: string;
  options: RadioOption[];
}

export type WidgetConfig = SliderWidgetConfig | RadioGroupWidgetConfig;

export function createWidgetConfig(
  nodeId: string,
  inputs: Parameter[],
  nodeType: string
): WidgetConfig | null {
  switch (nodeType) {
    case "slider": {
      const minInput = inputs.find((i) => i.id === "min");
      const maxInput = inputs.find((i) => i.id === "max");
      const stepInput = inputs.find((i) => i.id === "step");
      const valueInput = inputs.find((i) => i.id === "value");

      if (!minInput || !maxInput || !stepInput || !valueInput) {
        console.warn(`Missing required inputs for slider widget in node ${nodeId}`);
        return null;
      }

      return {
        type: 'slider',
        id: nodeId,
        name: 'Slider',
        min: Number(minInput.value) || 0,
        max: Number(maxInput.value) || 100,
        step: Number(stepInput.value) || 1,
        value: Number(valueInput.value) || 0,
      };
    }
    case "radio-group": {
      const optionsInput = inputs.find((i) => i.id === "options");
      const valueInput = inputs.find((i) => i.id === "value");

      if (!optionsInput) {
        console.warn(`Missing options input for radio group widget in node ${nodeId}`);
        return null;
      }

      // Ensure options is an array and has the correct structure
      let options: RadioOption[] = [];
      try {
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
      } catch (e) {
        console.warn("Failed to process radio group options");
      }

      // If we have no valid options, create a default one
      if (options.length === 0) {
        options = [{ value: "default", label: "Default Option" }];
      }

      return {
        options,
        value: (valueInput?.value as string) || options[0].value,
      };
    }
    default:
      return null;
  }
} 