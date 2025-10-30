import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileInputWidgetProps } from "./types";

export function AudioInputWidget({
  input,
  value,
  onClear,
  readonly,
  showClearButton,
  isUploading,
  uploadError,
  onFileUpload,
  createObjectUrl,
  className,
  active,
}: FileInputWidgetProps) {
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

  return (
    <div className={cn(className)}>
      {hasValue ? (
        <div className={cn(
          "relative rounded-md p-2 bg-white dark:bg-neutral-950",
          active
            ? "border border-blue-500"
            : "border border-neutral-300 dark:border-neutral-700"
        )}>
          {(() => {
            const objectUrl = getObjectUrl();
            return objectUrl ? (
              <audio
                controls
                className="w-full text-xs"
                preload="metadata"
              >
                <source
                  src={objectUrl}
                  type={(value as any)?.mimeType || "audio/*"}
                />
              </audio>
            ) : null;
          })()}
          {!readonly && showClearButton && (
            <ClearButton
              onClick={onClear}
              label="Clear audio"
              className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            />
          )}
        </div>
      ) : (
        <div className={cn(
          "flex flex-col items-center justify-center space-y-2 p-3 rounded-md bg-white dark:bg-neutral-950",
          active
            ? "border border-blue-500"
            : "border border-neutral-300 dark:border-neutral-700"
        )}>
          <Upload className="h-5 w-5 text-neutral-400" />
          <label
            htmlFor={`audio-upload-${input.id}`}
            className={cn(
              "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
              (isUploading || readonly) && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </label>
          <input
            id={`audio-upload-${input.id}`}
            type="file"
            className="hidden"
            onChange={onFileUpload}
            disabled={isUploading || readonly}
            accept="audio/*"
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
