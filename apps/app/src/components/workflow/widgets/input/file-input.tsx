import Download from "lucide-react/icons/download";
import File from "lucide-react/icons/file";
import Trash2 from "lucide-react/icons/trash-2";
import Upload from "lucide-react/icons/upload";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { mimeTypeDetectors } from "@/components/workflow/fields/file-upload-handler";
import { ModelViewer } from "@/components/workflow/model-viewer";
import { isObjectReference, useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface FileWidgetProps extends BaseWidgetProps {
  value: any;
}

function FileWidget({ value, onChange, readonly = false }: FileWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (readonly) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsUploading(true);

      // Determine MIME type using specialized detectors
      let mimeType = file.type || "application/octet-stream";

      // Handle special cases for Office formats
      if (file.name.endsWith(".xlsx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (file.name.endsWith(".xls")) {
        mimeType = "application/vnd.ms-excel";
      } else if (file.name.endsWith(".gltf") || file.name.endsWith(".glb")) {
        // Use gltf detector for proper MIME type detection
        mimeType = mimeTypeDetectors.gltf(file);
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);

      onChange(reference);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  const clearFile = () => {
    if (readonly) return;
    onChange(null);
  };

  const downloadFile = () => {
    if (!objectUrl) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getObjectUrl = (): string | null => {
    if (!value || !isObjectReference(value)) return null;
    try {
      return createObjectUrl(value);
    } catch (error) {
      console.error("Failed to create object URL:", error);
      return null;
    }
  };

  const objectUrl = getObjectUrl();
  const mimeType = value && isObjectReference(value) ? value.mimeType : null;
  const isImage = mimeType?.startsWith("image/");
  const isAudio = mimeType?.startsWith("audio/");
  const isVideo = mimeType?.startsWith("video/");
  const isGltf =
    mimeType === "model/gltf+json" || mimeType === "model/gltf-binary";

  const getMimeTypeDisplay = (mime: string | null): string => {
    if (!mime) return "Unknown";
    const parts = mime.split("/");
    return parts[parts.length - 1].toUpperCase();
  };

  return (
    <div className={cn("w-full h-full", !value && "p-2")}>
      <div className="overflow-hidden w-full h-full">
        {value && isObjectReference(value) ? (
          <>
            {/* Full-screen preview with absolute positioned buttons */}
            {isAudio && objectUrl ? (
              <div className="w-full h-full flex items-center justify-between gap-4 px-2 py-2">
                <audio src={objectUrl} controls className="flex-1" />
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={downloadFile}
                    className="h-8 w-8 bg-white/75 hover:bg-white dark:bg-neutral-900/75 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                    disabled={readonly}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    className="h-8 w-8 bg-white/75 hover:bg-white dark:bg-neutral-900/75 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                    disabled={readonly}
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Preview section based on MIME type */}
                {isImage && objectUrl && (
                  <img
                    src={objectUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                {isVideo && objectUrl && (
                  <video
                    src={objectUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
                {isGltf && objectUrl && (
                  <ModelViewer
                    parameter={{ id: "", name: "file", type: "gltf" }}
                    objectUrl={objectUrl}
                  />
                )}
                {!isImage && !isVideo && !isGltf && objectUrl && (
                  <div className="w-full h-full flex items-center justify-between gap-4 px-2 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <File className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-neutral-700 truncate">
                        {getMimeTypeDisplay(mimeType)}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={downloadFile}
                        className="h-8 w-8 bg-white/75 hover:bg-white dark:bg-neutral-900/75 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                        disabled={readonly}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearFile}
                        className="h-8 w-8 bg-white/75 hover:bg-white dark:bg-neutral-900/75 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
                        disabled={readonly}
                        title="Remove file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <label
            htmlFor="file-upload"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full cursor-pointer",
              (isUploading || readonly) && "opacity-50 pointer-events-none"
            )}
          >
            <div className="w-full flex items-center justify-center gap-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2">
              <Upload className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <div className="text-xs text-blue-500 hover:text-blue-600">
                {isUploading ? "Uploading..." : "Upload"}
              </div>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading || readonly}
              accept="*/*"
            />
          </label>
        )}
        {error && (
          <div className="text-xs text-red-600 text-center p-2">{error}</div>
        )}
      </div>
    </div>
  );
}

export const fileInputWidget = createWidget({
  component: FileWidget,
  nodeTypes: ["blob", "file", "document", "image", "audio"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
  }),
});
