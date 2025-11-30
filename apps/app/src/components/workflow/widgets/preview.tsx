import { ObjectReference } from "@dafthunk/types";

import { Field } from "@/components/workflow/fields/field";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface PreviewWidgetProps extends BaseWidgetProps {
  value?: any;
  parameterType?: string;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function PreviewWidget({
  value,
  parameterType = "any",
  className,
  createObjectUrl,
}: PreviewWidgetProps) {
  // Create a synthetic parameter object for the Field component
  const parameter = {
    name: "Preview",
    type: parameterType as any,
    value,
    required: false,
    id: "preview",
  };

  const hasValue = value !== undefined && value !== null;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        hasValue ? "h-full" : "min-h-44 bg-muted/30",
        className
      )}
    >
      {!hasValue ? (
        <span className="text-xs text-muted-foreground">No preview</span>
      ) : (
        <div className="w-full h-full">
          <Field
            parameter={parameter}
            value={value}
            onChange={() => {}} // Preview nodes don't allow editing
            onClear={() => {}} // No clearing allowed
            createObjectUrl={createObjectUrl}
            disabled={true}
            asWidget={true}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Widget for displaying preview node values
 * Supports all parameter types: string, number, boolean, date, blob, image, document, audio, buffergeometry, gltf, json, geojson, secret, any
 */
export const previewWidget = createWidget({
  component: PreviewWidget,
  nodeTypes: [
    "preview-number",
    "preview-boolean",
    "preview-date",
    "preview-blob",
    "preview-image",
    "preview-document",
    "preview-audio",
    "preview-buffergeometry",
    "preview-gltf",
    "preview-json",
    "preview-geojson",
    "preview-secret",
    "preview-any",
  ],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    // Get the value input (what user is providing/connecting)
    const valueInput = inputs.find((i) => i.name === "value");

    // Get the displayValue output (what the node outputs after execution)
    // The displayValue output contains the previewed value
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");

    // Use displayValue output if available (from execution), otherwise use input value
    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview,
      parameterType: valueInput?.type || "any",
    };
  },
});
