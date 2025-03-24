import { Parameter } from "../workflow-node";
import { WidgetConfig, SliderWidgetConfig } from "./types";

export function createWidgetConfig(
  nodeId: string,
  inputs: Parameter[],
  nodeType: string
): WidgetConfig | null {
  switch (nodeType) {
    case "slider":
      return createSliderConfig(nodeId, inputs);
    default:
      return null;
  }
}

function createSliderConfig(nodeId: string, inputs: Parameter[]): SliderWidgetConfig {
  const min = inputs.find((i) => i.id === "min")?.value || 0;
  const max = inputs.find((i) => i.id === "max")?.value || 100;
  const step = inputs.find((i) => i.id === "step")?.value || 1;
  const value = inputs.find((i) => i.id === "value")?.value;

  return {
    type: "slider",
    id: nodeId,
    name: "Slider",
    min: typeof min === "number" ? min : 0,
    max: typeof max === "number" ? max : 100,
    step: typeof step === "number" ? step : 1,
    value: typeof value === "number" ? value : min,
  };
} 