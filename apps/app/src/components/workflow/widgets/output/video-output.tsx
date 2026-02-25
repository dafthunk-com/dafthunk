import type { ObjectReference } from "@dafthunk/types";

import { cn } from "@/utils/utils";

import { VideoField } from "../../fields/video-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface VideoOutputWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function VideoOutputWidget({
  value,
  className,
  createObjectUrl,
}: VideoOutputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <VideoField
        parameter={{ id: "preview", name: "value", type: "video" }}
        value={value}
        onChange={() => {}}
        onClear={() => {}}
        onFileUpload={async () => {}}
        createObjectUrl={createObjectUrl}
        disabled
      />
    </div>
  );
}

export const videoOutputWidget = createWidget({
  component: VideoOutputWidget,
  nodeTypes: ["output-video"],
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
