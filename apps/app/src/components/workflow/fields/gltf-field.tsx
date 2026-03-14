import { cn } from "@/utils/utils";

import { ModelViewer } from "../model-viewer";
import {
  FileFieldPlaceholder,
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
  uploadError,
  value,
}: GltfFieldProps & { uploadError?: string | null }) {
  const {
    isUploading,
    uploadError: internalUploadError,
    handleUpload,
  } = useFileUpload(UPLOAD_CONFIG, onChange);
  const objectUrl = getObjectUrl(value, createObjectUrl);
  const hasValue = objectUrl !== null;
  const displayError = uploadError ?? internalUploadError;

  if (disabled && !hasValue) {
    return (
      <FileFieldPlaceholder
        className={cn("h-[320px] flex items-start", className)}
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
          disabled && "bg-muted/50 border border-border",
          !disabled &&
            "bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700",
          className
        )}
      >
        <ModelViewer parameter={parameter} objectUrl={objectUrl} />
        {displayError && (
          <p className="absolute bottom-1 left-1 text-xs text-red-600 dark:text-red-400 bg-white/80 dark:bg-neutral-900/80 rounded px-1">
            {displayError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-[320px] flex flex-col items-center justify-center space-y-2 p-3 rounded-md border border-neutral-300 dark:border-neutral-700",
        className
      )}
    >
      <FileUploadZone
        accept=".gltf,.glb"
        disabled={disabled}
        isUploading={isUploading}
        uploadError={displayError}
        onFileUpload={handleUpload}
        parameterId={parameter.id}
        fieldType="gltf"
      />
    </div>
  );
}
