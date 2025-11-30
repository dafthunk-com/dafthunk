import type { ObjectReference } from "@dafthunk/types";

import { DocumentField } from "../fields/document-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface DocumentPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function DocumentPreviewWidget({
  value,
  className,
  createObjectUrl,
}: DocumentPreviewWidgetProps) {
  return (
    <DocumentField
      parameter={{ id: "preview", name: "value", type: "document" }}
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

export const documentPreviewWidget = createWidget({
  component: DocumentPreviewWidget,
  nodeTypes: ["preview-document"],
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
