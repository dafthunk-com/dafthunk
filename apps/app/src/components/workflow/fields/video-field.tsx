import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { FileFieldProps, ObjectReference } from "./types";

export function VideoField({
  className,
  connected,
  createObjectUrl,
  disabled,
  isUploading,
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
    ? (value as ObjectReference)?.mimeType || "video/*"
    : "video/*";

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No video"}
      </div>
    );
  }

  // Has value (disabled or enabled) - show video player
  if (hasValue) {
    return (
      <div
        className={cn(
          "relative rounded-md p-2",
          disabled && "bg-muted/50 border border-border",
          !disabled && "border border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        {objectUrl && (
          <video controls className="w-full text-xs rounded" preload="metadata">
            <source src={objectUrl} type={mimeType} />
          </video>
        )}
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
      <div className="flex flex-col items-center justify-center space-y-2 p-3 rounded-md border border-neutral-300 dark:border-neutral-700">
        <Upload className="h-5 w-5 text-neutral-400" />
        <label
          htmlFor={`video-upload-${parameter.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={`video-upload-${parameter.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept="video/*"
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
