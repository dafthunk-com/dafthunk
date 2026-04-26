import { cn } from "@/utils/utils";

import { ModelViewer } from "../model-viewer";
import { FieldPlaceholder } from "./field-placeholder";
import {
  FileUploadZone,
  getObjectUrl,
  useFileUpload,
} from "./file-field-primitives";
import { mimeTypeDetectors } from "./file-upload-handler";
import type { FieldProps, ObjectReference } from "./types";

const UPLOAD_CONFIG = {
  getMimeType: mimeTypeDetectors.gltf,
  errorMessage: "Failed to upload glTF model",
} as const;

export interface GltfFieldProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function GltfField({
  className,
  connected,
  createObjectUrl,
  disabled,
  onChange,
  parameter,
  value,
}: GltfFieldProps) {
  const { isUploading, uploadError, handleUpload } = useFileUpload(
    UPLOAD_CONFIG,
    onChange
  );
  const objectUrl = getObjectUrl(value, createObjectUrl);
  const hasValue = objectUrl !== null;

  if (disabled && !hasValue) {
    return (
      <FieldPlaceholder
        className={className}
        connected={connected}
        label="No 3D model"
      />
    );
  }

  if (hasValue) {
    return (
      <div
        className={cn(
          "relative h-[320px] rounded-md overflow-hidden",
          disabled && "bg-background border border-input opacity-50",
          !disabled &&
            "bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        <ModelViewer parameter={parameter} objectUrl={objectUrl} />
        {uploadError && (
          <p className="absolute bottom-1 left-1 text-xs text-red-600 dark:text-red-400 bg-white/80 dark:bg-neutral-900/80 rounded px-1">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  return (
    <FileUploadZone
      className={className}
      accept=".gltf,.glb"
      disabled={disabled}
      isUploading={isUploading}
      uploadError={uploadError}
      onFileUpload={handleUpload}
      parameterId={parameter.id}
      fieldType="gltf"
    />
  );
}
