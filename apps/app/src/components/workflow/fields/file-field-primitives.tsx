import Upload from "lucide-react/icons/upload";
import { useCallback, useRef, useState } from "react";

import { isObjectReference, useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { FileUploadConfig } from "./file-upload-handler";
import { createFileUploadHandler } from "./file-upload-handler";
import type { ObjectReference } from "./types";

/**
 * Safely resolve an object URL from a value that may be an ObjectReference.
 */
export function getObjectUrl(
  value: unknown,
  createObjectUrl?: (ref: ObjectReference) => string
): string | null {
  if (!value || !isObjectReference(value) || !createObjectUrl) return null;
  try {
    return createObjectUrl(value as ObjectReference);
  } catch (error) {
    console.error("Failed to create object URL:", error);
    return null;
  }
}

/**
 * Placeholder shown when a file field is disabled and has no value.
 */
export function FileFieldPlaceholder({
  className,
  connected,
  label,
}: {
  className?: string;
  connected?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "text-xs text-neutral-500 italic p-2 bg-background rounded-md border border-neutral-300 dark:border-neutral-700",
        className
      )}
    >
      {connected ? "Connected" : label}
    </div>
  );
}

/**
 * Upload zone with file input, upload label, and error display.
 */
export function FileUploadZone({
  className,
  accept,
  disabled,
  isUploading,
  uploadError,
  onFileUpload,
  parameterId,
  fieldType,
}: {
  className?: string;
  accept: string;
  disabled?: boolean;
  isUploading: boolean;
  uploadError: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  parameterId: string;
  fieldType: string;
}) {
  const inputId = `${fieldType}-upload-${parameterId}`;
  return (
    <div className={cn(className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center space-y-2 p-3 rounded-md border border-neutral-300 dark:border-neutral-700",
          !disabled && "bg-background"
        )}
      >
        <Upload className="h-5 w-5 text-neutral-400" />
        <label
          htmlFor={inputId}
          className={cn(
            "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
            (isUploading || disabled) && "opacity-50 pointer-events-none"
          )}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </label>
        <input
          id={inputId}
          type="file"
          className="hidden"
          onChange={onFileUpload}
          disabled={isUploading || disabled}
          accept={accept}
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

/**
 * Hook that encapsulates file upload state and handler creation.
 * Each file field calls this instead of receiving upload props from the parent.
 */
export function useFileUpload(
  config: FileUploadConfig,
  onChange: (value: unknown) => void
) {
  const { uploadBinaryData } = useObjectService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Ref to avoid stale closure in async upload handler
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const stableOnChange = useCallback(
    (...args: Parameters<typeof onChange>) => onChangeRef.current(...args),
    []
  );

  const handleUpload = useCallback(
    createFileUploadHandler(
      config,
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  return { isUploading, uploadError, handleUpload };
}
