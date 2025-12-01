import { cn } from "@/utils/utils";

import { GeoJSONField } from "../../fields/geojson-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface GeoJSONOutputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GeoJSONOutputWidget({ value, className }: GeoJSONOutputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="h-full relative nowheel nopan">
        <GeoJSONField
          parameter={{ id: "output", name: "value", type: "geojson" }}
          value={value}
          onChange={() => {}}
          onClear={() => {}}
          disabled
        />
      </div>
    </div>
  );
}

export const geojsonOutputWidget = createWidget({
  component: GeoJSONOutputWidget,
  nodeTypes: ["output-geojson"],
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
