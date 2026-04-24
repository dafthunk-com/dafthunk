import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import {
  FileFieldPlaceholder,
  FileUploadZone,
  getObjectUrl,
  useFileUpload,
} from "./file-field-primitives";
import { fileValidators } from "./file-upload-handler";
import type { FieldProps, ObjectReference } from "./types";

const UPLOAD_CONFIG = {
  validateFile: fileValidators.audio,
  errorMessage: "Failed to upload audio",
} as const;

export interface AudioFieldProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function AudioField({
  className,
  connected,
  createObjectUrl,
  disabled,
  onChange,
  parameter,
  value,
}: AudioFieldProps) {
  const { isUploading, uploadError, handleUpload } = useFileUpload(
    UPLOAD_CONFIG,
    onChange
  );
  const objectUrl = getObjectUrl(value, createObjectUrl);
  const hasValue = objectUrl !== null;
  const mimeType =
    value && isObjectReference(value)
      ? (value as ObjectReference)?.mimeType || "audio/*"
      : "audio/*";

  if (disabled && !hasValue) {
    return (
      <FileFieldPlaceholder
        className={className}
        connected={connected}
        label="No audio"
      />
    );
  }

  if (hasValue) {
    return (
      <div
        className={cn(
          "relative rounded-md p-2",
          disabled && "bg-muted/50 border border-border",
          !disabled &&
            "bg-background border border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        <audio controls className="w-full text-xs" preload="metadata">
          <source src={objectUrl} type={mimeType} />
        </audio>
        {uploadError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  return (
    <FileUploadZone
      className={className}
      accept="audio/*"
      disabled={disabled}
      isUploading={isUploading}
      uploadError={uploadError}
      onFileUpload={handleUpload}
      parameterId={parameter.id}
      fieldType="audio"
    />
  );
}
