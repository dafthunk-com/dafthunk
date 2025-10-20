import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import type { WorkflowParameter } from "../workflow-types";

export interface TextAreaWidgetProps {
  type: "text-area";
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  rows: number;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type TextAreaWidgetConfig = Omit<
  TextAreaWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

export const TextAreaWidgetMeta = {
  nodeTypes: ["text-area"],
  inputField: "value",
  createConfig: (
    nodeId: string,
    inputs: WorkflowParameter[]
  ): TextAreaWidgetConfig => {
    const valueInput = inputs.find((i) => i.id === "value");
    const placeholderInput = inputs.find((i) => i.id === "placeholder");
    const rowsInput = inputs.find((i) => i.id === "rows");

    if (!valueInput || !rowsInput) {
      console.warn(
        `Missing required inputs for text area widget in node ${nodeId}`
      );
      return null as any;
    }

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
  },
};

export function TextAreaWidget({
  value,
  placeholder,
  onChange,
  className,
  compact = false,
  readonly = false,
}: TextAreaWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readonly) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={cn("space-y-2 p-2", className)}>
      {!compact && <Label>Text Area</Label>}
      <Textarea
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder || "Enter text..."}
        className={cn(compact && "min-h-[100px]")}
        disabled={readonly}
      />
    </div>
  );
}
