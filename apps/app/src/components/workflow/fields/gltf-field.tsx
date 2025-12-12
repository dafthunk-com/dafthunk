import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ModelViewer } from "../model-viewer";
import type { FileFieldProps, ObjectReference } from "./types";

export function GltfField({
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

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "h-[320px] text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border flex items-start",
          className
        )}
      >
        {connected ? "Connected" : "No 3D model"}
      </div>
    );
  }

  // Has value - show 3D model viewer
  if (hasValue) {
    return (
      <div
        className={cn(
          "relative h-[320px] rounded-md overflow-hidden",
          disabled && "bg-muted/50 border border-border",
          !disabled &&
            "bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        {objectUrl && (
          <ModelViewer parameter={parameter} objectUrl={objectUrl} />
        )}
        {uploadError && (
          <p className="absolute bottom-1 left-1 text-xs text-red-600 dark:text-red-400 bg-white/80 dark:bg-neutral-900/80 rounded px-1">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  // No value - show upload zone
  return (
    <div
      className={cn(
        "relative h-[320px] flex flex-col items-center justify-center space-y-2 p-3 rounded-md border border-neutral-300 dark:border-neutral-700",
        className
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
      {uploadError && (
        <p className="absolute bottom-2 text-xs text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}
    </div>
  );
}
