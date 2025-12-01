import type { ObjectReference } from "@dafthunk/types";

import { cn } from "@/utils/utils";

import { GltfField } from "../../fields/gltf-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface GltfOutputWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function GltfOutputWidget({
  value,
  className,
  createObjectUrl,
}: GltfOutputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <GltfField
        parameter={{ id: "preview", name: "value", type: "gltf" }}
        value={value}
        onChange={() => {}}
        onClear={() => {}}
        onFileUpload={async () => {}}
        createObjectUrl={createObjectUrl}
        disabled
      />
    </div>
  );
}

export const gltfOutputWidget = createWidget({
  component: GltfOutputWidget,
  nodeTypes: ["output-gltf"],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");
    const valueInput = inputs.find((i) => i.name === "value");

    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview,
    };
  },
});
