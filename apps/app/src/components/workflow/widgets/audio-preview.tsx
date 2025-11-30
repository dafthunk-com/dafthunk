import type { ObjectReference } from "@dafthunk/types";

import { AudioField } from "../fields/audio-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface AudioPreviewWidgetProps extends BaseWidgetProps {
  value: ObjectReference | undefined;
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

function AudioPreviewWidget({
  value,
  className,
  createObjectUrl,
}: AudioPreviewWidgetProps) {
  return (
    <AudioField
      parameter={{ id: "preview", name: "value", type: "audio" }}
      value={value}
      onChange={() => {}}
      onClear={() => {}}
      onFileUpload={async () => {}}
      createObjectUrl={createObjectUrl}
      disabled
      asWidget
      className={className}
    />
  );
}

export const audioPreviewWidget = createWidget({
  component: AudioPreviewWidget,
  nodeTypes: ["preview-audio"],
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
