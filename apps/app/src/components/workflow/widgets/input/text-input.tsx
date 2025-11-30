import { cn } from "@/utils/utils";

import { TextField } from "../../fields/text-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface TextInputWidgetProps extends BaseWidgetProps {
  value: string;
}

function TextInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: TextInputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <TextField
        parameter={{ id: "input", name: "value", type: "string" }}
        value={value ?? ""}
        onChange={onChange}
        onClear={() => onChange("")}
        disabled={readonly}
      />
    </div>
  );
}

export const textInputWidget = createWidget({
  component: TextInputWidget,
  nodeTypes: ["text-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
  }),
});
