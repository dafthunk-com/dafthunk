import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FileInputWidgetProps } from "./types";

export function ImageInputWidget({
  input,
  value,
  onClear,
  readonly,
  isUploading,
  uploadError,
  onFileUpload,
  createObjectUrl,
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
    <div>
      {hasValue ? (
        <div className="relative border rounded-md overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          {(() => {
            const objectUrl = getObjectUrl();
            return objectUrl ? (
              <img
                src={objectUrl}
                alt="Uploaded image"
                className="w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null;
          })()}
          {!readonly && (
            <ClearButton
              onClick={onClear}
              label="Clear image"
              className="absolute top-1 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
          <Upload className="h-5 w-5 text-neutral-400" />
          <label
            htmlFor={`image-upload-${input.id}`}
            className={cn(
              "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
              (isUploading || readonly) && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </label>
          <input
            id={`image-upload-${input.id}`}
            type="file"
            className="hidden"
            onChange={onFileUpload}
            disabled={isUploading || readonly}
            accept="image/*"
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
