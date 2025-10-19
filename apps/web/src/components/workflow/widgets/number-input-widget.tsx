import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";

import type { WorkflowParameter } from "../workflow-types";

export interface NumberInputWidgetProps {
  type: "number-input";
  id: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type NumberInputWidgetConfig = Omit<
  NumberInputWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

export const NumberInputWidgetMeta = {
  nodeTypes: ["number-input"],
  inputField: "value",
  createConfig: (nodeId: string, inputs: WorkflowParameter[]): NumberInputWidgetConfig => {
    const valueInput = inputs.find((i) => i.id === "value");
    const minInput = inputs.find((i) => i.id === "min");
    const maxInput = inputs.find((i) => i.id === "max");
    const stepInput = inputs.find((i) => i.id === "step");
    const placeholderInput = inputs.find((i) => i.id === "placeholder");

    if (!valueInput) {
      console.warn(`Missing required inputs for number input widget in node ${nodeId}`);
      return null as any;
    }

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
  },
};

export function NumberInputWidget({
  value,
  min,
  max,
  step,
  placeholder,
  onChange,
  className,
  compact = false,
  readonly = false,
}: NumberInputWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  return (
    <div className={cn("space-y-2 p-2", className)}>
      {!compact && <Label>Number Input</Label>}
      <Input
        type="number"
        value={value || ""}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder || "Enter number..."}
        className={cn(compact && "h-8 text-sm")}
        disabled={readonly}
      />
    </div>
  );
}
