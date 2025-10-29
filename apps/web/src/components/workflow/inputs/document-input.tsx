import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";

import { isObjectReference } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { FileInputWidgetProps } from "./types";

export function DocumentInputWidget({
  input,
  value,
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
        <div className="relative flex items-center gap-2 p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900">
          <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          {(() => {
            const objectUrl = getObjectUrl();
            return objectUrl ? (
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 truncate flex-1"
              >
                Download
              </a>
            ) : null;
          })()}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-3 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900">
          <Upload className="h-5 w-5 text-neutral-400" />
          <label
            htmlFor={`document-upload-${input.id}`}
            className={cn(
              "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
              (isUploading || readonly) && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </label>
          <input
            id={`document-upload-${input.id}`}
            type="file"
            className="hidden"
            onChange={onFileUpload}
            disabled={isUploading || readonly}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml"
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
