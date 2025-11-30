import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { BlobField } from "../fields/blob-field";
import {
  createFileUploadHandler,
  mimeTypeDetectors,
} from "../fields/file-upload-handler";
import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface BlobInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function BlobInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: BlobInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      getMimeType: (file: File) => {
        // Check for GLTF files
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".gltf") || fileName.endsWith(".glb")) {
          return mimeTypeDetectors.gltf(file);
        }
        // Check for document types
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          return mimeTypeDetectors.document(file);
        }
        return file.type || "application/octet-stream";
      },
      errorMessage: "Failed to upload file",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <BlobField
        parameter={{ id: "input", name: "value", type: "blob" }}
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

export const blobInputWidget = createWidget({
  component: BlobInputWidget,
  nodeTypes: ["blob-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
