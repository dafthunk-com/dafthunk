import type { ObjectReference } from "@dafthunk/types";

import { cn } from "@/utils/utils";

import { DocumentField } from "../../fields/document-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface DocumentOutputWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function DocumentOutputWidget({
  value,
  className,
  createObjectUrl,
}: DocumentOutputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <DocumentField
        parameter={{ id: "preview", name: "value", type: "document" }}
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

export const documentOutputWidget = createWidget({
  component: DocumentOutputWidget,
  nodeTypes: ["output-document"],
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
