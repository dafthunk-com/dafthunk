import type React from "react";

export interface FileUploadConfig {
  validateFile?: (file: File) => void;
  getMimeType?: (file: File) => string;
  errorMessage: string;
}

export function createFileUploadHandler(
  config: FileUploadConfig,
  uploadBinaryData: (
    arrayBuffer: ArrayBuffer,
    mimeType: string
  ) => Promise<unknown>,
  onChange: (value: unknown) => void,
  setIsUploading: (loading: boolean) => void,
  setUploadError: (error: string | null) => void
) {
  return async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      // Validate file if validator provided
      if (config.validateFile) {
        config.validateFile(file);
      }

      // Get MIME type (use custom detector or default to file.type)
      const mimeType = config.getMimeType ? config.getMimeType(file) : file.type;

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      onChange(reference);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : config.errorMessage
      );
    }
  };
}

// Pre-configured validators and MIME type detectors
export const fileValidators = {
  image: (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file");
    }
  },
  audio: (file: File) => {
    if (!file.type.startsWith("audio/")) {
      throw new Error("Please select a valid audio file");
    }
  },
};

export const mimeTypeDetectors = {
  document: (file: File): string => {
    if (file.name.endsWith(".xlsx")) {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (file.name.endsWith(".xls")) {
      return "application/vnd.ms-excel";
    }
    return file.type;
  },
  gltf: (file: File): string => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".gltf")) {
      return "model/gltf+json";
    }
    if (fileName.endsWith(".glb")) {
      return "model/gltf-binary";
    }
    return file.type;
  },
  bufferGeometry: (): string => {
    return "application/x-buffer-geometry";
  },
};
