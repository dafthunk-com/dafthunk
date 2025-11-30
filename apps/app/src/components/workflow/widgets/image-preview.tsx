import type { ObjectReference } from "@dafthunk/types";

import { ImageField } from "../fields/image-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface ImagePreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function ImagePreviewWidget({
  value,
  className,
  createObjectUrl,
}: ImagePreviewWidgetProps) {
  return (
    <ImageField
      parameter={{ id: "preview", name: "value", type: "image" }}
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

export const imagePreviewWidget = createWidget({
  component: ImagePreviewWidget,
  nodeTypes: ["preview-image"],
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
