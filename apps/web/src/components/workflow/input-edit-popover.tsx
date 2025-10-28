import { Position } from "@xyflow/react";
import File from "lucide-react/icons/file";
import Upload from "lucide-react/icons/upload";
import XCircleIcon from "lucide-react/icons/x-circle";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
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
import { TypeBadge } from "@/components/workflow/workflow-node";
import type { WorkflowParameter } from "@/components/workflow/workflow-types";
import { isObjectReference, useObjectService } from "@/services/object-service";
import { useSecrets } from "@/services/secrets-service";
import { cn } from "@/utils/utils";

interface InputEditPopoverProps {
  nodeId: string;
  nodeInputs: WorkflowParameter[];
  input: WorkflowParameter | null;
  isOpen: boolean;
  onClose: () => void;
  readonly?: boolean;
  anchorElement?: HTMLElement | null;
}

export function InputEditPopover({
  nodeId,
  nodeInputs,
  input,
  isOpen,
  onClose,
  readonly,
  anchorElement,
}: InputEditPopoverProps) {
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
    <Popover open={isOpen} onOpenChange={onClose}>
      {anchorElement && (
        <PopoverAnchor virtualRef={{ current: anchorElement }} />
      )}
      <PopoverContent side="left" align="start" className="w-80 rounded-xl">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <TypeBadge
                type={input.type}
                position={Position.Left}
                id={input.id}
                parameter={input}
                readonly={true}
                className="!rounded-[0.3rem]"
                size="md"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {input.name}
              </span>
            </div>
            {!readonly && (
              <button
                onClick={handleClearValue}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex-shrink-0"
                aria-label="Clear value"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Input Fields */}
          <div className="space-y-2">
            {input.type === "boolean" ? (
              <div className="flex gap-2">
                <Button
                  variant={inputValue === "true" ? "default" : "outline"}
                  onClick={() => handleInputChange("true")}
                  className="flex-1 h-8 text-xs"
                  disabled={readonly}
                >
                  True
                </Button>
                <Button
                  variant={inputValue === "false" ? "default" : "outline"}
                  onClick={() => handleInputChange("false")}
                  className="flex-1 h-8 text-xs"
                  disabled={readonly}
                >
                  False
                </Button>
              </div>
            ) : input.type === "number" ? (
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter number"
                disabled={readonly}
                className="h-8 text-sm"
              />
            ) : input.type === "string" ? (
              <Textarea
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    onClose();
                  }
                }}
                placeholder="Enter text"
                className="min-h-[80px] resize-none text-sm"
                disabled={readonly}
              />
            ) : input.type === "json" ? (
              <Textarea
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    onClose();
                  }
                }}
                placeholder="Enter JSON"
                className="min-h-[80px] resize-none text-sm"
                disabled={readonly}
              />
            ) : input.type === "secret" ? (
              <Select
                value={inputValue}
                onValueChange={handleSecretSelect}
                disabled={readonly || isSecretsLoading}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue
                    placeholder={
                      isSecretsLoading
                        ? "Loading..."
                        : secrets.length === 0
                          ? "No secrets"
                          : "Select secret"
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
            ) : input.type === "image" ? (
              <div className="space-y-2">
                {inputValue && isObjectReference(input.value) ? (
                  <div className="relative border rounded-md overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                    {(() => {
                      const objectUrl = getObjectUrl(input.value);
                      return objectUrl ? (
                        <img
                          src={objectUrl}
                          alt="Uploaded image"
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null;
                    })()}
                    {!readonly && (
                      <button
                        onClick={clearObjectReference}
                        className="absolute top-1 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        aria-label="Clear image"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                    <Upload className="h-5 w-5 text-neutral-400" />
                    <label
                      htmlFor={`image-upload-${input.id}`}
                      className={cn(
                        "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
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
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : input.type === "document" ? (
              <div className="space-y-2">
                {inputValue && isObjectReference(input.value) ? (
                  <div className="relative flex items-center gap-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                    <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                    {(() => {
                      const objectUrl = getObjectUrl(input.value);
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
                  <div className="flex flex-col items-center justify-center space-y-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                    <Upload className="h-5 w-5 text-neutral-400" />
                    <label
                      htmlFor={`document-upload-${input.id}`}
                      className={cn(
                        "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
                        (isUploading || readonly) &&
                          "opacity-50 pointer-events-none"
                      )}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
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
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : input.type === "audio" ? (
              <div className="space-y-2">
                {inputValue && isObjectReference(input.value) ? (
                  <div className="relative border rounded-md p-2 bg-neutral-50 dark:bg-neutral-900">
                    {(() => {
                      const objectUrl = getObjectUrl(input.value);
                      return objectUrl ? (
                        <audio
                          controls
                          className="w-full h-6 text-xs"
                          preload="metadata"
                        >
                          <source
                            src={objectUrl}
                            type={input.value?.mimeType || "audio/*"}
                          />
                        </audio>
                      ) : null;
                    })()}
                    {!readonly && (
                      <button
                        onClick={clearObjectReference}
                        className="absolute top-1 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        aria-label="Clear audio"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                    <Upload className="h-5 w-5 text-neutral-400" />
                    <label
                      htmlFor={`audio-upload-${input.id}`}
                      className={cn(
                        "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
                        (isUploading || readonly) &&
                          "opacity-50 pointer-events-none"
                      )}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
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
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : input.type === "gltf" ? (
              <div className="space-y-2">
                {inputValue && isObjectReference(input.value) ? (
                  <div className="relative flex items-center gap-2 p-2 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                    <File className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                    {(() => {
                      const objectUrl = getObjectUrl(input.value);
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
                  <div className="flex flex-col items-center justify-center space-y-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                    <Upload className="h-5 w-5 text-neutral-400" />
                    <label
                      htmlFor={`gltf-upload-${input.id}`}
                      className={cn(
                        "text-xs text-blue-500 hover:text-blue-600 cursor-pointer",
                        (isUploading || readonly) &&
                          "opacity-50 pointer-events-none"
                      )}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
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
                )}
                {uploadError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {uploadError}
                  </p>
                )}
              </div>
            ) : (
              <Input
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter value"
                disabled={readonly}
                className="h-8 text-sm"
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
