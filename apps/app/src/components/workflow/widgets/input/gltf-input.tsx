import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { GltfField } from "../../fields/gltf-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface GltfInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GltfInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: GltfInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 w-full", className)}>
      <GltfField
        parameter={{ id: "input", name: "value", type: "gltf" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(undefined)}
        createObjectUrl={createObjectUrl}
        disabled={disabled}
        clearable
        className="!h-[160px]"
      />
    </div>
  );
}

export const gltfInputWidget = createWidget({
  component: GltfInputWidget,
  nodeTypes: ["gltf-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
