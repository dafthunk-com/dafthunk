import type { ObjectReference } from "@dafthunk/types";
import Box from "lucide-react/icons/box";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface BufferGeometryPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
}

function BufferGeometryPreviewWidget({
  value,
  className,
}: BufferGeometryPreviewWidgetProps) {
  const hasValue = value !== undefined && isObjectReference(value);
  const objectRef = hasValue ? (value as ObjectReference) : null;

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-md p-3 min-h-[100px]">
        {hasValue && objectRef ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Box className="h-8 w-8 text-neutral-400" />
            <span className="text-xs font-medium">Buffer Geometry</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[80px] bg-muted/30">
            <Box className="h-8 w-8 text-neutral-400 mb-2" />
            <span className="text-xs text-muted-foreground">No geometry</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const buffergeometryPreviewWidget = createWidget({
  component: BufferGeometryPreviewWidget,
  nodeTypes: ["preview-buffergeometry"],
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
