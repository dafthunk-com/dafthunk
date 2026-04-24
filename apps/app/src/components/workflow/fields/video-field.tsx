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
  validateFile: fileValidators.video,
  errorMessage: "Failed to upload video",
} as const;

export interface VideoFieldProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function VideoField({
  className,
  connected,
  createObjectUrl,
  disabled,
  onChange,
  parameter,
  value,
}: VideoFieldProps) {
  const { isUploading, uploadError, handleUpload } = useFileUpload(
    UPLOAD_CONFIG,
    onChange
  );
  const objectUrl = getObjectUrl(value, createObjectUrl);
  const hasValue = objectUrl !== null;
  const mimeType =
    value && isObjectReference(value)
      ? (value as ObjectReference)?.mimeType || "video/*"
      : "video/*";

  if (disabled && !hasValue) {
    return (
      <FileFieldPlaceholder
        className={className}
        connected={connected}
        label="No video"
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
        <video controls className="w-full text-xs rounded" preload="metadata">
          <source src={objectUrl} type={mimeType} />
        </video>
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
      accept="video/*"
      disabled={disabled}
      isUploading={isUploading}
      uploadError={uploadError}
      onFileUpload={handleUpload}
      parameterId={parameter.id}
      fieldType="video"
    />
  );
}
