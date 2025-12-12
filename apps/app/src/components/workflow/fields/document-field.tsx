import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { FileFieldProps, ObjectReference } from "./types";

export function DocumentField({
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
  const mimeType = hasValue ? (value as ObjectReference)?.mimeType : null;
  const isPDF = mimeType === "application/pdf";
  const isImage = mimeType?.startsWith("image/");

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No document"}
      </div>
    );
  }

  // Has value - show preview based on document type
  if (hasValue) {
    // No URL available for preview
    if (!objectUrl) {
      return (
        <div
          className={cn(
            "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          No document preview available
        </div>
      );
    }

    // PDF documents - show iframe viewer
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

    // Image documents - show image preview
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

    // Other document types - show filename
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

  // No value - show upload zone
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-2 p-3 rounded-md border border-neutral-300 dark:border-neutral-700",
        className
      )}
    >
      <Upload className="h-5 w-5 text-neutral-400" />
      <label
        htmlFor={`document-upload-${parameter.id}`}
        className={cn(
          "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
          (isUploading || disabled) && "opacity-50 pointer-events-none"
        )}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </label>
      <input
        id={`document-upload-${parameter.id}`}
        type="file"
        className="hidden"
        onChange={onFileUpload}
        disabled={isUploading || disabled}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml"
      />
      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {uploadError}
        </p>
      )}
    </div>
  );
}
