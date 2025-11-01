import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileFieldProps, ObjectReference } from "./types";

export function AudioField({
  input,
  value,
  onClear,
  disabled,
  clearable,
  isUploading,
  uploadError,
  onFileUpload,
  createObjectUrl,
  className,
  active,
  connected,
  previewable = true,
  editable = true,
}: FileFieldProps) {
  const hasValue = value !== undefined && isObjectReference(value);

  // Non-editable or disabled state without value
  if ((!editable || disabled) && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No audio"}
      </div>
    );
  }

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
    ? (value as ObjectReference)?.mimeType || "audio/*"
    : "audio/*";

  // Has value (disabled or enabled)
  if (hasValue) {
    // If not previewable, show simple text
    if (!previewable) {
      return (
        <div
          className={cn(
            "text-xs p-2 rounded-md border border-border",
            disabled
              ? "bg-muted/50 text-neutral-500"
              : "bg-white dark:bg-neutral-950",
            className
          )}
        >
          Audio: {(value as ObjectReference).id}
          {!disabled && clearable && (
            <ClearButton
              onClick={onClear}
              label="Clear audio"
              className="ml-2"
            />
          )}
        </div>
      );
    }

    return (
      <div className={cn(className)}>
        <div
          className={cn(
            "relative rounded-md p-2",
            disabled && "bg-muted/50 border border-border",
            !disabled && "bg-white dark:bg-neutral-950",
            !disabled && active && "border border-blue-500",
            !disabled &&
              !active &&
              "border border-neutral-300 dark:border-neutral-700"
          )}
        >
          {objectUrl && (
            <audio controls className="w-full text-xs" preload="metadata">
              <source src={objectUrl} type={mimeType} />
            </audio>
          )}
          {!disabled && clearable && (
            <ClearButton
              onClick={onClear}
              label="Clear audio"
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

  // No value - upload zone (only if editable)
  if (!editable) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No audio"}
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center space-y-2 p-3 rounded-md bg-white dark:bg-neutral-950",
          active && "border border-blue-500",
          !active && "border border-neutral-300 dark:border-neutral-700"
        )}
      >
        <Upload className="h-5 w-5 text-neutral-400" />
        <label
          htmlFor={`audio-upload-${input.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={`audio-upload-${input.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept="audio/*"
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
