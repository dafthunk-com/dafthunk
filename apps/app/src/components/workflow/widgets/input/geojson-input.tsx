import { cn } from "@/utils/utils";

import { GeoJSONField } from "../../fields/geojson-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface GeoJSONInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GeoJSONInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: GeoJSONInputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="h-full relative nowheel nopan">
        <GeoJSONField value={value} onChange={onChange} disabled={readonly} />
      </div>
    </div>
  );
}

export const geojsonInputWidget = createWidget({
  component: GeoJSONInputWidget,
  nodeTypes: ["geojson-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
