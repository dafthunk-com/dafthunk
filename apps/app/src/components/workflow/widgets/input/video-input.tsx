import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { VideoField } from "../../fields/video-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface VideoInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function VideoInputWidget({
  value,
  onChange,
  className,
  disabled = false,
}: VideoInputWidgetProps) {
  const { createObjectUrl } = useObjectService();

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <VideoField
        parameter={{ id: "input", name: "value", type: "video" }}
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

export const videoInputWidget = createWidget({
  component: VideoInputWidget,
  nodeTypes: ["video-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
