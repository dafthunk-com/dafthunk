import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/utils";

import type { WorkflowParameter } from "../workflow-types";

export interface SliderWidgetProps {
  type: "slider";
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type SliderWidgetConfig = Omit<
  SliderWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

export const SliderWidgetMeta = {
  nodeTypes: ["slider"],
  inputField: "value",
  createConfig: (nodeId: string, inputs: WorkflowParameter[]): SliderWidgetConfig => ({
    type: "slider",
    id: nodeId,
    name: "Slider",
    value: Number(inputs.find((i) => i.id === "value")?.value) || 0,
    min: Number(inputs.find((i) => i.id === "min")?.value) || 0,
    max: Number(inputs.find((i) => i.id === "max")?.value) || 100,
    step: Number(inputs.find((i) => i.id === "step")?.value) || 1,
  }),
};

export function SliderWidget({
  value,
  min,
  max,
  step,
  onChange,
  className,
  compact = false,
  readonly = false,
}: SliderWidgetProps) {
  const handleValueChange = (values: number[]) => {
    if (values.length > 0 && !readonly) {
      onChange(values[0]);
    }
  };

  return (
    <div className={cn("space-y-2 p-2", className)}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleValueChange}
        className={cn("py-4", compact && "py-2")}
        disabled={readonly}
      />
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{min}</span>
        <span>Value: {value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
