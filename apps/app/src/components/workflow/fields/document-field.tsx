import File from "lucide-react/icons/file";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import {
  FileFieldPlaceholder,
  FileUploadZone,
  getObjectUrl,
  useFileUpload,
} from "./file-field-primitives";
import { mimeTypeDetectors } from "./file-upload-handler";
import type { FieldProps, ObjectReference } from "./types";

const UPLOAD_CONFIG = {
  getMimeType: mimeTypeDetectors.document,
  errorMessage: "Failed to upload document",
} as const;

export interface DocumentFieldProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function DocumentField({
  className,
  connected,
  createObjectUrl,
  disabled,
  onChange,
  parameter,
  value,
}: DocumentFieldProps) {
  const { isUploading, uploadError, handleUpload } = useFileUpload(
    UPLOAD_CONFIG,
    onChange
  );
  const hasRef = value !== undefined && isObjectReference(value);
  const objectUrl = getObjectUrl(value, createObjectUrl);
  const mimeType = hasRef ? (value as ObjectReference)?.mimeType : null;
  const isPDF = mimeType === "application/pdf";
  const isImage = mimeType?.startsWith("image/");

  if (disabled && !hasRef) {
    return (
      <FileFieldPlaceholder
        className={className}
        connected={connected}
        label="No document"
      />
    );
  }

  if (hasRef) {
    if (!objectUrl) {
      return (
        <FileFieldPlaceholder
          className={className}
          label="No document preview available"
        />
      );
    }

    if (isPDF) {
      return (
        <div
          className={cn(
            "relative rounded-md overflow-hidden border",
            disabled && "bg-muted/50 border-border",
            !disabled && "border-neutral-300 dark:border-neutral-700",
            className
          )}
        >
          <iframe src={objectUrl} className="w-full h-64 nowheel" />
        </div>
      );
    }

    if (isImage) {
      return (
        <div
          className={cn(
            "relative rounded-md overflow-hidden border",
            disabled && "bg-muted/50 border-border",
            !disabled && "border-neutral-300 dark:border-neutral-700",
            className
          )}
        >
          <img src={objectUrl} alt="Document" className="w-full object-cover" />
        </div>
      );
    }

    const filename =
      (value as ObjectReference)?.filename ||
      `Document (${mimeType?.split("/")[1] || "unknown"})`;
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md border",
          disabled && "bg-muted/50 border-border",
          !disabled && "border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
        <span
          className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1"
          title={filename}
        >
          {filename}
        </span>
      </div>
    );
  }

  return (
    <FileUploadZone
      className={className}
      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml"
      disabled={disabled}
      isUploading={isUploading}
      uploadError={uploadError}
      onFileUpload={handleUpload}
      parameterId={parameter.id}
      fieldType="document"
    />
  );
}
