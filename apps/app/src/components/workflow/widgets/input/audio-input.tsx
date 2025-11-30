import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { AudioField } from "../../fields/audio-field";
import {
  createFileUploadHandler,
  fileValidators,
} from "../../fields/file-upload-handler";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface AudioInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function AudioInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: AudioInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.audio,
      errorMessage: "Failed to upload audio",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <AudioField
        parameter={{ id: "input", name: "value", type: "audio" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(undefined)}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        uploadError={uploadError}
        createObjectUrl={createObjectUrl}
        disabled={readonly}
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
