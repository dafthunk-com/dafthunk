import React, { useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AudioInputWidget } from "./audio-input-widget";
import { BooleanInputWidget } from "./boolean-input-widget";
import { DocumentInputWidget } from "./document-input-widget";
import { GenericInputWidget } from "./generic-input-widget";
import { GltfInputWidget } from "./gltf-input-widget";
import { ImageInputWidget } from "./image-input-widget";
import { NumberInputWidget } from "./number-input-widget";
import { SecretInputWidget } from "./secret-input-widget";
import { TextInputWidget } from "./text-input-widget";
import type { InputWidgetProps } from "./types";

export interface InputWidgetRouterProps extends InputWidgetProps {
  createObjectUrl?: (objectReference: any) => string;
}

export function InputWidget(props: InputWidgetRouterProps) {
  const { input, createObjectUrl } = props;
  const { uploadBinaryData } = useObjectService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, file.type);
      props.onChange(reference);
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
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      let mimeType = file.type;
      if (file.name.endsWith(".xlsx")) {
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (file.name.endsWith(".xls")) {
        mimeType = "application/vnd.ms-excel";
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      props.onChange(reference);
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
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      if (!file.type.startsWith("audio/")) {
        throw new Error("Please select a valid audio file");
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, file.type);
      props.onChange(reference);
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
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      let mimeType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".gltf")) {
        mimeType = "model/gltf+json";
      } else if (fileName.endsWith(".glb")) {
        mimeType = "model/gltf-binary";
      }

      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      props.onChange(reference);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload glTF model"
      );
    }
  };

  // Route to appropriate widget based on input type
  switch (input.type) {
    case "boolean":
      return <BooleanInputWidget {...props} />;
    case "number":
      return <NumberInputWidget {...props} />;
    case "string":
    case "json":
      return <TextInputWidget {...props} />;
    case "secret":
      return <SecretInputWidget {...props} />;
    case "image":
      return (
        <ImageInputWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleImageUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "document":
      return (
        <DocumentInputWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleDocumentUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "audio":
      return (
        <AudioInputWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleAudioUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "gltf":
      return (
        <GltfInputWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleGltfUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    default:
      return <GenericInputWidget {...props} />;
  }
}
