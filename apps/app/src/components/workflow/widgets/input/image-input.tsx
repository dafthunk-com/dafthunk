import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ImageField } from "../../fields/image-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface ImageInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function ImageInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: ImageInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <ImageField
        parameter={{ id: "input", name: "value", type: "image" }}
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

export const imageInputWidget = createWidget({
  component: ImageInputWidget,
  nodeTypes: ["image-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
