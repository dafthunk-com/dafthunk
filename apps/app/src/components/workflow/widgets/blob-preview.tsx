import type { ObjectReference } from "@dafthunk/types";

import { BlobField } from "../fields/blob-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface BlobPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function BlobPreviewWidget({
  value,
  className,
  createObjectUrl,
}: BlobPreviewWidgetProps) {
  return (
    <BlobField
      parameter={{ id: "preview", name: "value", type: "blob" }}
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

export const blobPreviewWidget = createWidget({
  component: BlobPreviewWidget,
  nodeTypes: ["preview-blob"],
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
