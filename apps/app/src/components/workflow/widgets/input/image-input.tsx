import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import {
  createFileUploadHandler,
  fileValidators,
} from "../../fields/file-upload-handler";
import { ImageField } from "../../fields/image-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface ImageInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function ImageInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: ImageInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.image,
      errorMessage: "Failed to upload image",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <ImageField
        parameter={{ id: "input", name: "value", type: "image" }}
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

export const imageInputWidget = createWidget({
  component: ImageInputWidget,
  nodeTypes: ["image-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
