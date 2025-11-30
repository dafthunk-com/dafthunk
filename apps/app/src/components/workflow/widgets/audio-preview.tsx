import type { ObjectReference } from "@dafthunk/types";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface AudioPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function AudioPreviewWidget({
  value,
  className,
  createObjectUrl,
}: AudioPreviewWidgetProps) {
  const hasValue = value !== undefined && isObjectReference(value);

  const getObjectUrl = (): string | null => {
    if (!hasValue || !createObjectUrl) return null;
    try {
      return createObjectUrl(value as ObjectReference);
    } catch (error) {
      console.error("Failed to create object URL:", error);
      return null;
    }
  };

  const objectUrl = getObjectUrl();
  const mimeType = hasValue
    ? (value as ObjectReference)?.mimeType || "audio/*"
    : "audio/*";

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="relative border border-neutral-300 dark:border-neutral-700 rounded-md p-2">
        {hasValue && objectUrl ? (
          <audio controls className="w-full text-xs" preload="metadata">
            <source src={objectUrl} type={mimeType} />
          </audio>
        ) : (
          <div className="flex items-center justify-center h-10">
            <span className="text-xs text-muted-foreground">No audio</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const audioPreviewWidget = createWidget({
  component: AudioPreviewWidget,
  nodeTypes: ["preview-audio"],
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
