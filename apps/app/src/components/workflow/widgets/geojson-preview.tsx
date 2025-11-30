import { cn } from "@/utils/utils";

import { GeoJSONField } from "../fields/geojson-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface GeoJSONPreviewWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GeoJSONPreviewWidget({ value, className }: GeoJSONPreviewWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <GeoJSONField
        parameter={{ id: "preview", name: "value", type: "geojson" }}
        value={value}
        onChange={() => {}}
        onClear={() => {}}
        disabled
      />
    </div>
  );
}

export const geojsonPreviewWidget = createWidget({
  component: GeoJSONPreviewWidget,
  nodeTypes: ["preview-geojson"],
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
