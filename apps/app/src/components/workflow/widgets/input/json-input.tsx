import { cn } from "@/utils/utils";

import { JsonField } from "../../fields/json-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface JsonInputWidgetProps extends BaseWidgetProps {
  value: string;
}

function JsonInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: JsonInputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="h-[200px] relative nowheel nopan">
        <JsonField
          value={value}
          onChange={onChange}
          onClear={() => onChange("{}")}
          disabled={readonly}
        />
      </div>
    </div>
  );
}

export const jsonInputWidget = createWidget({
  component: JsonInputWidget,
  nodeTypes: ["json-input"],
  inputField: "json",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "json", "{}"),
  }),
});
