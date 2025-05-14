import { useState } from "react";
import { Label } from "@/components/ui/label";
import { File, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { useObjectService, isObjectReference } from "@/services/objectService";

export interface DocumentConfig {
  value: any; // Now stores an object reference
}

interface DocumentWidgetProps {
  config: DocumentConfig;
  onChange: (value: any) => void;
  compact?: boolean;
}

export function DocumentWidget({
  config,
  onChange,
  compact = false,
}: DocumentWidgetProps) {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(() => {
    // Initialize fileName from config if it exists and has a value
    if (config?.value && isObjectReference(config.value)) {
      return "Uploaded Document";
    }
    return null;
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { uploadBinaryData } = useObjectService();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsUploading(true);
      setFileName(file.name);

      // Ensure correct mime type for Excel files
      let mimeType = file.type;
      if (file.name.endsWith(".xlsx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (file.name.endsWith(".xls")) {
        mimeType = "application/vnd.ms-excel";
      }

      // Read the file as an array buffer
      const arrayBuffer = await file.arrayBuffer();

      // Upload the document to the objects endpoint
      const reference = await uploadBinaryData(arrayBuffer, mimeType);

      // Pass the reference directly to the parent
      // The DocumentValue class will validate the format
      console.log("Uploading document with reference:", reference);
      onChange(reference);

      setIsUploading(false);
    } catch (err) {
      setFileName(null);
      setIsUploading(false);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  const clearDocument = () => {
    setFileName(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Document Upload</Label>}
      <div className="relative w-full mx-auto">
        <div
          className={cn(
            "border rounded-lg overflow-hidden bg-white",
            compact ? "p-2" : "p-4"
          )}
        >
          {fileName ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                <span className="text-sm text-neutral-700 truncate">
                  {fileName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDocument}
                className="h-6 w-6 flex-shrink-0"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-neutral-400" />
              <div className="text-sm text-neutral-500 text-center">
                <label
                  htmlFor="document-upload"
                  className={cn(
                    "cursor-pointer text-blue-500 hover:text-blue-600",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  {isUploading ? "Uploading..." : "Click to upload"}
                </label>
                <input
                  id="document-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml,.png,.jpg,.jpeg,.webp,.svg"
                />
              </div>
            </div>
          )}
          {error && (
            <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
