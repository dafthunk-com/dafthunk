import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import {
  createFileUploadHandler,
  fileValidators,
  mimeTypeDetectors,
} from "../fields/file-upload-handler";
import { GltfField } from "../fields/gltf-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface GltfInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function GltfInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: GltfInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.gltf,
      getMimeType: mimeTypeDetectors.gltf,
      errorMessage: "Failed to upload GLTF model",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <GltfField
        parameter={{ id: "input", name: "value", type: "gltf" }}
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

export const gltfInputWidget = createWidget({
  component: GltfInputWidget,
  nodeTypes: ["gltf-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
