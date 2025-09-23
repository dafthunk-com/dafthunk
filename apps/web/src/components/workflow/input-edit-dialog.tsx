import Download from "lucide-react/icons/download";
import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";
import XCircleIcon from "lucide-react/icons/x-circle";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "@/components/workflow/workflow-context";
import { WorkflowParameter } from "@/components/workflow/workflow-types";
import { isObjectReference, useObjectService } from "@/services/object-service";
import { useSecrets } from "@/services/secrets-service";
import { cn } from "@/utils/utils";

interface InputEditDialogProps {
  nodeId: string;
  nodeInputs: WorkflowParameter[];
  input: WorkflowParameter | null;
  isOpen: boolean;
  onClose: () => void;
  readonly?: boolean;
}

export function InputEditDialog({
  nodeId,
  nodeInputs,
  input,
  isOpen,
  onClose,
  readonly,
}: InputEditDialogProps) {
  const { updateNodeData } = useWorkflow();
  const [inputValue, setInputValue] = useState("");
  const { secrets, isSecretsLoading } = useSecrets();
  const { uploadBinaryData, createObjectUrl } = useObjectService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Helper function to create object URL for previews and downloads
  const getObjectUrl = (objectRef: any): string | null => {
    if (!isObjectReference(objectRef)) return null;
    try {
      return createObjectUrl(objectRef);
    } catch (error) {
      console.error("Failed to create object URL:", error);
      return null;
    }
  };

  useEffect(() => {
    if (input) {
      if (input.value !== undefined) {
        // Handle ObjectReference types specially
        if (isObjectReference(input.value)) {
          setInputValue("Uploaded File");
        } else {
          setInputValue(String(input.value));
        }
      } else {
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
    // Clear upload error when input changes
    setUploadError(null);
  }, [input]);

  const handleInputChange = (value: string) => {
    if (!input || readonly || !updateNodeData) return;

    setInputValue(value);
    const typedValue = convertValueByType(value, input.type);
    updateNodeInput(nodeId, input.id, typedValue, nodeInputs, updateNodeData);
  };

  const handleClearValue = () => {
    if (!input || readonly || !updateNodeData) return;

    clearNodeInput(nodeId, input.id, nodeInputs, updateNodeData);
    setInputValue("");
  };

  const handleSecretSelect = (secretName: string) => {
    if (!input || readonly || !updateNodeData) return;

    setInputValue(secretName);
    updateNodeInput(nodeId, input.id, secretName, nodeInputs, updateNodeData);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !input || readonly || !updateNodeData) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      // Validate image file
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, file.type);
      updateNodeInput(nodeId, input.id, reference, nodeInputs, updateNodeData);
      setInputValue(file.name);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !input || readonly || !updateNodeData) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      // Ensure correct mime type for Excel files
      let mimeType = file.type;
      if (file.name.endsWith(".xlsx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (file.name.endsWith(".xls")) {
        mimeType = "application/vnd.ms-excel";
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      updateNodeInput(nodeId, input.id, reference, nodeInputs, updateNodeData);
      setInputValue(file.name);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload document"
      );
    }
  };

  const handleAudioUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !input || readonly || !updateNodeData) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      // Validate audio file
      if (!file.type.startsWith("audio/")) {
        throw new Error("Please select a valid audio file");
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, file.type);
      updateNodeInput(nodeId, input.id, reference, nodeInputs, updateNodeData);
      setInputValue(file.name);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload audio"
      );
    }
  };

  const handleGltfUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !input || readonly || !updateNodeData) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      // Set appropriate MIME type for glTF files
      let mimeType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".gltf")) {
        mimeType = "model/gltf+json";
      } else if (fileName.endsWith(".glb")) {
        mimeType = "model/gltf-binary";
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      updateNodeInput(nodeId, input.id, reference, nodeInputs, updateNodeData);
      setInputValue(file.name);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload glTF model"
      );
    }
  };

  const clearObjectReference = () => {
    if (!input || readonly || !updateNodeData) return;

    clearNodeInput(nodeId, input.id, nodeInputs, updateNodeData);
    setInputValue("");
    setUploadError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onClose();
    }
  };

  if (!input) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Parameter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="input-value" className="text-sm font-medium">
                {input.name}
              </Label>
              <span className="text-xs text-neutral-500">{input.type}</span>
            </div>

            <div className="relative">
              {input.type === "boolean" ? (
                <div className="flex gap-2">
                  <Button
                    variant={inputValue === "true" ? "default" : "outline"}
                    onClick={() => handleInputChange("true")}
                    className="flex-1"
                    disabled={readonly}
                  >
                    True
                  </Button>
                  <Button
                    variant={inputValue === "false" ? "default" : "outline"}
                    onClick={() => handleInputChange("false")}
                    className="flex-1"
                    disabled={readonly}
                  >
                    False
                  </Button>
                </div>
              ) : input.type === "number" ? (
                <div className="relative">
                  <Input
                    id="input-value"
                    type="number"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter number value"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "string" ? (
                <div className="relative">
                  <Textarea
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        onClose();
                      }
                    }}
                    placeholder="Enter text value"
                    className="min-h-[100px] resize-y"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "json" ? (
                <div className="relative">
                  <Textarea
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        onClose();
                      }
                    }}
                    placeholder="Enter json value"
                    className="min-h-[100px] resize-y"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "secret" ? (
                <div className="relative">
                  <Select
                    value={inputValue}
                    onValueChange={handleSecretSelect}
                    disabled={readonly || isSecretsLoading}
                  >
                    <SelectTrigger id="input-value">
                      <SelectValue
                        placeholder={
                          isSecretsLoading
                            ? "Loading secrets..."
                            : secrets.length === 0
                              ? "No secrets available"
                              : "Select a secret"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {secrets.map((secret) => (
                        <SelectItem key={secret.id} value={secret.name}>
                          {secret.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "image" ? (
                <div className="space-y-2">
                  {inputValue && isObjectReference(input.value) ? (
                    <div className="relative border rounded-md overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                      {/* Image Preview */}
                      {(() => {
                        const objectUrl = getObjectUrl(input.value);
                        return objectUrl ? (
                          <img
                            src={objectUrl}
                            alt="Uploaded image"
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              // Hide image on error and show fallback
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null;
                      })()}

                      {/* Clear Button Overlay */}
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearObjectReference}
                          className="absolute top-2 right-2 h-6 w-6 bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black"
                          disabled={isUploading}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                      <Upload className="h-8 w-8 text-neutral-400" />
                      <div className="text-sm text-neutral-500 text-center">
                        <label
                          htmlFor={`image-upload-${input.id}`}
                          className={cn(
                            "cursor-pointer text-blue-500 hover:text-blue-600",
                            (isUploading || readonly) &&
                              "opacity-50 pointer-events-none"
                          )}
                        >
                          {isUploading ? "Uploading..." : "Upload Image"}
                        </label>
                        <input
                          id={`image-upload-${input.id}`}
                          type="file"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploading || readonly}
                          accept="image/*"
                        />
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : input.type === "document" ? (
                <div className="space-y-2">
                  {inputValue && isObjectReference(input.value) ? (
                    <div className="relative flex items-center gap-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                      {/* File Icon and Download */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                        {(() => {
                          const objectUrl = getObjectUrl(input.value);
                          return objectUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(objectUrl, "_blank")}
                              className="h-6 px-2 text-xs"
                              title="Download file"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          ) : null;
                        })()}
                      </div>

                      {/* Clear Button */}
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearObjectReference}
                          className="h-6 w-6 flex-shrink-0"
                          disabled={isUploading}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                      <Upload className="h-8 w-8 text-neutral-400" />
                      <div className="text-sm text-neutral-500 text-center">
                        <label
                          htmlFor={`document-upload-${input.id}`}
                          className={cn(
                            "cursor-pointer text-blue-500 hover:text-blue-600",
                            (isUploading || readonly) &&
                              "opacity-50 pointer-events-none"
                          )}
                        >
                          {isUploading ? "Uploading..." : "Upload Document"}
                        </label>
                        <input
                          id={`document-upload-${input.id}`}
                          type="file"
                          className="hidden"
                          onChange={handleDocumentUpload}
                          disabled={isUploading || readonly}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html,.xml"
                        />
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : input.type === "audio" ? (
                <div className="space-y-2">
                  {inputValue && isObjectReference(input.value) ? (
                    <div className="relative border rounded-md p-2 bg-neutral-50 dark:bg-neutral-900">
                      {/* Audio Preview */}
                      {(() => {
                        const objectUrl = getObjectUrl(input.value);
                        return objectUrl ? (
                          <audio
                            controls
                            className="w-full h-8"
                            preload="metadata"
                          >
                            <source
                              src={objectUrl}
                              type={input.value?.mimeType || "audio/*"}
                            />
                            Your browser does not support the audio element.
                          </audio>
                        ) : null;
                      })()}

                      {/* Clear Button Overlay */}
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearObjectReference}
                          className="absolute top-2 right-2 h-6 w-6 bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black"
                          disabled={isUploading}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                      <Upload className="h-8 w-8 text-neutral-400" />
                      <div className="text-sm text-neutral-500 text-center">
                        <label
                          htmlFor={`audio-upload-${input.id}`}
                          className={cn(
                            "cursor-pointer text-blue-500 hover:text-blue-600",
                            (isUploading || readonly) &&
                              "opacity-50 pointer-events-none"
                          )}
                        >
                          {isUploading ? "Uploading..." : "Upload Audio"}
                        </label>
                        <input
                          id={`audio-upload-${input.id}`}
                          type="file"
                          className="hidden"
                          onChange={handleAudioUpload}
                          disabled={isUploading || readonly}
                          accept="audio/*"
                        />
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : input.type === "gltf" ? (
                <div className="space-y-2">
                  {inputValue && isObjectReference(input.value) ? (
                    <div className="relative flex items-center gap-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                      {/* File Icon and Download */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                        {(() => {
                          const objectUrl = getObjectUrl(input.value);
                          return objectUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(objectUrl, "_blank")}
                              className="h-6 px-2 text-xs"
                              title="Download glTF model"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          ) : null;
                        })()}
                      </div>

                      {/* Clear Button */}
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearObjectReference}
                          className="h-6 w-6 flex-shrink-0"
                          disabled={isUploading}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                      <Upload className="h-8 w-8 text-neutral-400" />
                      <div className="text-sm text-neutral-500 text-center">
                        <label
                          htmlFor={`gltf-upload-${input.id}`}
                          className={cn(
                            "cursor-pointer text-blue-500 hover:text-blue-600",
                            (isUploading || readonly) &&
                              "opacity-50 pointer-events-none"
                          )}
                        >
                          {isUploading ? "Uploading..." : "Upload glTF Model"}
                        </label>
                        <input
                          id={`gltf-upload-${input.id}`}
                          type="file"
                          className="hidden"
                          onChange={handleGltfUpload}
                          disabled={isUploading || readonly}
                          accept=".gltf,.glb"
                        />
                      </div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter text value"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
