import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ModelViewer } from "../model-viewer";
import { ClearButton } from "./clear-button";
import type { FileFieldProps, ObjectReference } from "./types";

export function GltfField({
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
  asWidget,
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

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic",
          !asWidget && "p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No 3D model"}
      </div>
    );
  }

  // Disabled state with value - show 3D model viewer
  if (disabled && hasValue) {
    if (objectUrl) {
      return (
        <div
          className={cn(
            "relative",
            !asWidget && "p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          <ModelViewer
            parameter={parameter}
            objectUrl={objectUrl}
            compact={asWidget}
          />
        </div>
      );
    }
  }

  // Enabled state with value - show download link
  if (hasValue) {
    return (
      <div className={cn(className)}>
        <div
          className={cn(
            "relative flex items-center gap-2",
            !asWidget &&
              "p-2 rounded-md bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700"
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
              label="Clear GLTF file"
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
          "flex flex-col items-center justify-center space-y-2",
          !asWidget &&
            "p-3 rounded-md bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700"
        )}
      >
        <Upload className="h-5 w-5 text-neutral-400" />
        <label
          htmlFor={`gltf-upload-${parameter.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={`gltf-upload-${parameter.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept=".gltf,.glb"
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
