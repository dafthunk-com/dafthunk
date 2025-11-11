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
        "bg-muted/30 flex items-center justify-center",
        hasValue ? "h-full" : "min-h-44",
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
    "preview-string",
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
  extractConfig: (_nodeId, inputs) => {
    // Get the value input (what user is providing/connecting)
    // The value input is persisted automatically in executions and deployments
    const valueInput = inputs.find((i) => i.name === "value");

    return {
      value: valueInput?.value,
      parameterType: valueInput?.type || "any",
    };
  },
});
