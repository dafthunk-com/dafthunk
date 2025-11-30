import { cn } from "@/utils/utils";

import { SecretField } from "../fields/secret-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface SecretInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function SecretInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: SecretInputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <SecretField
        parameter={{ id: "input", name: "value", type: "secret" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(undefined)}
        disabled={readonly}
        clearable
      />
    </div>
  );
}

export const secretInputWidget = createWidget({
  component: SecretInputWidget,
  nodeTypes: ["secret-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
