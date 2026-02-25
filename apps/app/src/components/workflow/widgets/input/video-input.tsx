import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";
import {
  createFileUploadHandler,
  fileValidators,
} from "../../fields/file-upload-handler";
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
  readonly = false,
}: VideoInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.video,
      errorMessage: "Failed to upload video",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <VideoField
        parameter={{ id: "input", name: "value", type: "video" }}
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

export const videoInputWidget = createWidget({
  component: VideoInputWidget,
  nodeTypes: ["video-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
