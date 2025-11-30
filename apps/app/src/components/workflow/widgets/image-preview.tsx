import type { ObjectReference } from "@dafthunk/types";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

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

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="relative overflow-hidden w-full h-full min-h-[100px] border border-neutral-300 dark:border-neutral-700 rounded-md bg-muted/30">
        {hasValue && objectUrl ? (
          <img
            src={objectUrl}
            alt="Preview"
            className="w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <span className="text-xs text-muted-foreground">No image</span>
          </div>
        )}
      </div>
    </div>
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
