import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileFieldProps, ObjectReference } from "./types";

export function BufferGeometryField({
  className,
  clearable,
  connected,
  createObjectUrl,
  disabled,
  isUploading,
  onClear,
  onFileUpload,
  parameter,
  uploadError,
  value,
}: FileFieldProps) {
  // File fields check for object references
  const hasValue = value !== undefined && isObjectReference(value);

  // Helper to safely create object URL for preview
  const getObjectUrl = (): string | null => {
    if (!hasValue || !createObjectUrl) return null;
    try {
      return createObjectUrl(value as ObjectReference);
    } catch (error) {
      console.error("Failed to create object URL:", error);
      return null;
    }
  };

  const objectUrl = getObjectUrl();
  const mimeType = hasValue
    ? (value as ObjectReference)?.mimeType || "application/x-buffer-geometry"
    : "application/x-buffer-geometry";

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No geometry data"}
      </div>
    );
  }

  // Disabled state with value - show geometry info and download link
  if (disabled && hasValue) {
    return (
      <div
        className={cn(
          "space-y-2 p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        <div className="text-xs text-neutral-500">3D Geometry ({mimeType})</div>
        {objectUrl && (
          <a
            href={objectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <File className="h-3 w-3" />
            Download Geometry Data
          </a>
        )}
      </div>
    );
  }

  // Enabled state with value - show download link
  if (hasValue) {
    return (
      <div className={cn(className)}>
        <div
          className={cn(
            "relative flex items-center gap-2 p-2 rounded-md bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700"
          )}
        >
          <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          {objectUrl && (
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 truncate flex-1"
            >
              Download
            </a>
          )}
          {!disabled && clearable && (
            <ClearButton
              onClick={onClear}
              label="Clear geometry"
              className="absolute top-2 right-1"
            />
          )}
        </div>
        {uploadError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  // No value - show upload zone
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center space-y-2 p-3 rounded-md bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700"
        )}
      >
        <Upload className="h-5 w-5 text-neutral-400" />
        <label
          htmlFor={`buffergeometry-upload-${parameter.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload Geometry"}
        </label>
        <input
          id={`buffergeometry-upload-${parameter.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept=".geometry,.buf"
        />
      </div>
      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {uploadError}
        </p>
      )}
    </div>
  );
}
