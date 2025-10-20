import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { WorkflowParameter } from "../workflow-types";

export interface InputTextWidgetProps {
  type: "input-text";
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type InputTextWidgetConfig = Omit<
  InputTextWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

export const InputTextWidgetMeta = {
  nodeTypes: ["input-text"],
  inputField: "value",
  createConfig: (
    nodeId: string,
    inputs: WorkflowParameter[]
  ): InputTextWidgetConfig => {
    const valueInput = inputs.find((i) => i.id === "value");
    const placeholderInput = inputs.find((i) => i.id === "placeholder");

    if (!valueInput) {
      console.warn(
        `Missing required inputs for input text widget in node ${nodeId}`
      );
      return null as any;
    }

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
  },
};

export function InputTextWidget({
  value,
  placeholder,
  onChange,
  compact = false,
}: InputTextWidgetProps) {
  return (
    <div className="space-y-2 p-2">
      {!compact && <Label>Text Input</Label>}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter text..."}
        className={compact ? "text-sm" : ""}
      />
    </div>
  );
}
