import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { DocumentField } from "../../fields/document-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface DocumentInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function DocumentInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: DocumentInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <DocumentField
        parameter={{ id: "input", name: "value", type: "document" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(undefined)}
        createObjectUrl={createObjectUrl}
        disabled={disabled}
        clearable
      />
    </div>
  );
}

export const documentInputWidget = createWidget({
  component: DocumentInputWidget,
  nodeTypes: ["document-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
