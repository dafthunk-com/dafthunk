import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { AudioField } from "../../fields/audio-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface AudioInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function AudioInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: AudioInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <AudioField
        parameter={{ id: "input", name: "value", type: "audio" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(undefined)}
        createObjectUrl={createObjectUrl}
        disabled={disabled}
        clearable
      />
    </div>
  );
}

export const audioInputWidget = createWidget({
  component: AudioInputWidget,
  nodeTypes: ["audio-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
