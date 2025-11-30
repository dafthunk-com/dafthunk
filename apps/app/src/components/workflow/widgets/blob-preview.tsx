import FileIcon from "lucide-react/icons/file";

import type { ObjectReference } from "@dafthunk/types";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface BlobPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
}

function BlobPreviewWidget({ value, className }: BlobPreviewWidgetProps) {
  const hasValue = value !== undefined && isObjectReference(value);
  const objectRef = hasValue ? (value as ObjectReference) : null;

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="relative border border-neutral-300 dark:border-neutral-700 rounded-md p-3">
        {hasValue && objectRef ? (
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-neutral-400" />
            <span className="text-xs font-medium truncate">
              {objectRef.mimeType || "Unknown type"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No file</span>
          </div>
        )}
      </div>
    </div>
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
