import { createDataUrl } from "@/lib/nodes/utility/binaryUtils";
import { WorkflowParameter } from "./workflow-types";

interface WorkflowOutputRendererProps {
  output: WorkflowParameter;
  compact?: boolean;
}

// Format output value for display
export const formatOutputValue = (value: any, type: string): string => {
  if (value === undefined || value === null) return "";

  try {
    if (type === "binary") {
      return ""; // Don't display binary data as text
    } else if (type === "object" || type === "array") {
      return JSON.stringify(value, null, 2);
    } else if (type === "boolean") {
      return value ? "true" : "false";
    } else if (type === "number") {
      return value.toString();
    }
    return String(value);
  } catch (e) {
    console.warn("Error formatting output value:", e);
    return String(value);
  }
};

export function WorkflowOutputRenderer({
  output,
  compact = false,
}: WorkflowOutputRendererProps) {
  if (output.type === "binary" && output.value) {
    if (output.value.data && output.value.mimeType?.startsWith("image/")) {
      try {
        const dataUrl = createDataUrl(output.value.data, output.value.mimeType);
        return (
          <div className={compact ? "mt-1 relative" : "mt-2 relative"}>
            <img
              src={dataUrl}
              alt={`${output.name} output`}
              className="w-full rounded-md border border-gray-200"
              onError={(e) => {
                console.error("Error loading image:", e);
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div className="hidden text-sm text-red-500 p-2 bg-red-50 rounded-md mt-1">
              Error displaying image. The data may be corrupted.
            </div>
          </div>
        );
      } catch (error) {
        console.error("Error processing image data:", error);
        return (
          <div
            className={
              compact
                ? "text-xs text-red-500 p-1 bg-red-50 rounded-md mt-1"
                : "text-sm text-red-500 p-2 bg-red-50 rounded-md"
            }
          >
            Error processing image data
          </div>
        );
      }
    }
    return (
      <div
        className={
          compact
            ? "text-xs text-gray-500 p-1 mt-1"
            : "relative w-full h-32 flex items-center justify-center rounded-lg border border-border bg-muted"
        }
      >
        <p className={compact ? "" : "text-sm text-muted-foreground"}>
          Binary data (mimeType: {output.value.mimeType})
        </p>
      </div>
    );
  }

  const formattedValue = formatOutputValue(output.value, output.type);
  if (!formattedValue) return null;

  return (
    <div
      className={
        compact
          ? "text-xs p-1 mt-1 bg-gray-50 rounded border border-gray-200"
          : "w-full p-2 bg-muted rounded-md border border-border"
      }
    >
      {formattedValue}
    </div>
  );
}
