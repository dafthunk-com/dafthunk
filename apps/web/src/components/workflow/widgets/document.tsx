import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";
import X from "lucide-react/icons/x";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { isObjectReference, useObjectService } from "@/services/object-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface DocumentWidgetProps extends BaseWidgetProps {
  value: any;
  mimeType: string;
}

function DocumentWidget({
  value,
  onChange,
  readonly = false,
}: DocumentWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(() => {
    if (value && isObjectReference(value)) {
      return "Uploaded Document";
    }
    return null;
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { uploadBinaryData } = useObjectService();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (readonly) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsUploading(true);
      setFileName(file.name);

      let mimeType = file.type;
      if (file.name.endsWith(".xlsx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (file.name.endsWith(".xls")) {
        mimeType = "application/vnd.ms-excel";
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);

      onChange(reference);
      setIsUploading(false);
    } catch (err) {
      setFileName(null);
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  const clearDocument = () => {
    if (readonly) return;
    setFileName(null);
    onChange(null);
  };

  return (
    <div className="p-2">
      <div className="overflow-hidden bg-white p-2">
        {fileName ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
              <span className="text-xs text-neutral-700 truncate">
                {fileName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearDocument}
              className="h-6 w-6 flex-shrink-0"
              disabled={isUploading || readonly}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-neutral-400" />
            <div className="text-xs text-neutral-500 text-center">
              <label
                htmlFor="document-upload"
                className={cn(
                  "cursor-pointer text-blue-500 hover:text-blue-600",
                  (isUploading || readonly) && "opacity-50 pointer-events-none"
                )}
              >
                {isUploading ? "Uploading..." : "Click to upload"}
              </label>
              <input
                id="document-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading || readonly}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml,.png,.jpg,.jpeg,.webp,.svg"
              />
            </div>
          </div>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-600 text-center">{error}</div>
        )}
      </div>
    </div>
  );
}

export const documentWidget = createWidget({
  component: DocumentWidget,
  nodeTypes: ["document"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    mimeType: getInputValue(inputs, "mimeType", "application/pdf"),
  }),
});
