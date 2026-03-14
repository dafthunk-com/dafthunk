import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { BlobField } from "../../fields/blob-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface BlobInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function BlobInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: BlobInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <BlobField
        parameter={{ id: "input", name: "value", type: "blob" }}
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

export const blobInputWidget = createWidget({
  component: BlobInputWidget,
  nodeTypes: ["blob-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
