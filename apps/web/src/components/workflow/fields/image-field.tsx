import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileFieldWidgetProps, ObjectReference } from "./types";

export function ImageFieldWidget({
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

  // Disabled state without value
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No image"}
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

  // Has value (disabled or enabled)
  if (hasValue) {
    return (
      <div className={cn(className)}>
        <div
          className={cn(
            "relative rounded-md overflow-hidden",
            disabled && "bg-muted/50 border border-border",
            !disabled && "bg-white dark:bg-neutral-950",
            !disabled && active && "border border-blue-500",
            !disabled && !active && "border border-neutral-300 dark:border-neutral-700"
          )}
        >
          {objectUrl && (
            <img
              src={objectUrl}
              alt="Uploaded image"
              className="w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {!disabled && showClearButton && (
            <ClearButton
              onClick={onClear}
              label="Clear image"
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

  // No value - upload zone
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
          htmlFor={`image-upload-${input.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={`image-upload-${input.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept="image/*"
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
