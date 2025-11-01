import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileFieldProps, ObjectReference } from "./types";

export function DocumentField({
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
        {connected ? "Connected" : "No document"}
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
  const mimeType = hasValue ? (value as ObjectReference)?.mimeType : null;
  const isPDF = mimeType === "application/pdf";
  const isImage = mimeType?.startsWith("image/");

  // Non-editable or disabled state with value - show preview based on type
  if ((!editable || disabled) && hasValue) {
    // If not previewable, show simple text
    if (!previewable) {
      return (
        <div
          className={cn(
            "text-xs p-2 rounded-md border border-border bg-muted/50 text-neutral-500",
            className
          )}
        >
          Document: {(value as ObjectReference).id}
        </div>
      );
    }

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

    // PDF viewer with iframe
    if (isPDF) {
      return (
        <div
          className={cn(
            "relative p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">PDF Document</span>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View
            </a>
          </div>
          <iframe
            src={objectUrl}
            className="w-full h-64 rounded-md border nowheel"
          />
        </div>
      );
    }

    // Image preview
    if (isImage) {
      return (
        <div
          className={cn(
            "relative p-2 bg-muted/50 rounded-md border border-border",
            className
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">Document (Image)</span>
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View
            </a>
          </div>
          <img
            src={objectUrl}
            alt="Document"
            className="w-full rounded-md border"
          />
        </div>
      );
    }

    // Other document types - show download link
    return (
      <div
        className={cn(
          "relative p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          <File className="h-3 w-3" />
          View Document ({mimeType?.split("/")[1] || "unknown"})
        </a>
      </div>
    );
  }

  // Has value (enabled) - show download link
  if (hasValue) {
    return (
      <div className={cn(className)}>
        <div
          className={cn(
            "relative flex items-center gap-2 p-2 rounded-md bg-white dark:bg-neutral-950",
            active && "border border-blue-500",
            !active && "border border-neutral-300 dark:border-neutral-700"
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
              label="Clear document"
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
        {connected ? "Connected" : "No document"}
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
          htmlFor={`document-upload-${input.id}`}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={`document-upload-${input.id}`}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml"
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
