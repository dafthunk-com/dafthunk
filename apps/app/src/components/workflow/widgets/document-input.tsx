import { useState } from "react";

import { useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { DocumentField } from "../fields/document-field";
import {
  createFileUploadHandler,
  mimeTypeDetectors,
} from "../fields/file-upload-handler";
import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface DocumentInputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function DocumentInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: DocumentInputWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileUpload = createFileUploadHandler(
    {
      getMimeType: mimeTypeDetectors.document,
      errorMessage: "Failed to upload document",
    },
    uploadBinaryData,
    onChange,
    setIsUploading,
    setUploadError
  );

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <DocumentField
        parameter={{ id: "input", name: "value", type: "document" }}
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

export const documentInputWidget = createWidget({
  component: DocumentInputWidget,
  nodeTypes: ["document-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", undefined),
  }),
});
