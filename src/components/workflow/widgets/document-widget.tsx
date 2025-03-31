import { useState } from "react";
import { Label } from "@/components/ui/label";
import { File, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DocumentConfig {
  value: string;
  mimeType: string;
}

interface DocumentWidgetProps {
  config: DocumentConfig;
  onChange: (value: string) => void;
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
    if (config?.value) {
      return "Uploaded Document";
    }
    return null;
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setFileName(file.name);

      // Read file as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(",")[1];

        // Ensure correct mime type for Excel files
        let mimeType = file.type;
        if (file.name.endsWith(".xlsx")) {
          mimeType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (file.name.endsWith(".xls")) {
          mimeType = "application/vnd.ms-excel";
        }

        // Create properly structured document output
        const documentOutput = {
          value: base64Data,
          mimeType,
        };

        onChange(JSON.stringify(documentOutput));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const clearDocument = () => {
    setFileName(null);
    onChange(
      JSON.stringify({
        value: "",
        mimeType: "application/pdf",
      })
    );
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
                <File className="h-4 w-4 flex-shrink-0 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">
                  {fileName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDocument}
                className="h-6 w-6 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div className="text-sm text-gray-500 text-center">
                <label
                  htmlFor="document-upload"
                  className="cursor-pointer text-blue-500 hover:text-blue-600"
                >
                  Click to upload
                </label>
                <input
                  id="document-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
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