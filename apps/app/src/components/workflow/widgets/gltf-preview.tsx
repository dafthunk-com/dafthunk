import type { ObjectReference } from "@dafthunk/types";

import { GltfField } from "../fields/gltf-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface GltfPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function GltfPreviewWidget({
  value,
  className,
  createObjectUrl,
}: GltfPreviewWidgetProps) {
  return (
    <GltfField
      parameter={{ id: "preview", name: "value", type: "gltf" }}
      value={value}
      onChange={() => {}}
      onClear={() => {}}
      onFileUpload={async () => {}}
      createObjectUrl={createObjectUrl}
      disabled
      asWidget
      className={className}
    />
  );
}

export const gltfPreviewWidget = createWidget({
  component: GltfPreviewWidget,
  nodeTypes: ["preview-gltf"],
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
