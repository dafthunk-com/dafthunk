import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileFieldWidgetProps } from "./types";

export function BufferGeometryFieldWidget({
  input,
  value,
  onClear,
  disabled,
  showClearButton,
  isUploading,
  uploadError,
  onFileUpload,
  createObjectUrl,
  className,
  active,
  connected,
}: FileFieldWidgetProps) {
  const hasValue = value !== undefined && isObjectReference(value);

  const getObjectUrl = (): string | null => {
    if (!hasValue || !createObjectUrl) return null;
    try {
      return createObjectUrl(value);
    } catch (error) {
      console.error("Failed to create object URL:", error);
      return null;
    }
  };

  // Disabled mode (read-only output)
  if (disabled) {
    if (!hasValue) {
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

    const objectUrl = getObjectUrl();
    const mimeType =
      (value as any)?.mimeType || "application/x-buffer-geometry";

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

  // Enabled mode (editable input with file upload)
  return (
    <div className={cn(className)}>
      {hasValue ? (
        <div
          className={cn(
            "relative flex items-center gap-2 p-2 rounded-md bg-white dark:bg-neutral-950",
            active
              ? "border border-blue-500"
              : "border border-neutral-300 dark:border-neutral-700"
          )}
        >
          <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          {(() => {
            const objectUrl = getObjectUrl();
            return objectUrl ? (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 truncate flex-1"
              >
                Download
              </a>
            ) : null;
          })()}
          {!disabled && showClearButton && (
            <ClearButton
              onClick={onClear}
              label="Clear geometry"
              className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            />
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center space-y-2 p-3 rounded-md bg-white dark:bg-neutral-950",
            active
              ? "border border-blue-500"
              : "border border-neutral-300 dark:border-neutral-700"
          )}
        >
          <Upload className="h-5 w-5 text-neutral-400" />
          <label
            htmlFor={`buffergeometry-upload-${input.id}`}
            className={cn(
              "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
              (isUploading || disabled) && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? "Uploading..." : "Upload Geometry"}
          </label>
          <input
            id={`buffergeometry-upload-${input.id}`}
            type="file"
            className="hidden"
            onChange={onFileUpload}
            disabled={isUploading || disabled}
            accept=".geometry,.buf"
          />
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {uploadError}
        </p>
      )}
    </div>
  );
}
