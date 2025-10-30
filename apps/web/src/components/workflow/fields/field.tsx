import type React from "react";
import { useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AnyFieldWidget } from "./any-field";
import { AudioFieldWidget } from "./audio-field";
import { BooleanFieldWidget } from "./boolean-field";
import { BufferGeometryFieldWidget } from "./buffergeometry-field";
import { DocumentFieldWidget } from "./document-field";
import { GenericFieldWidget } from "./generic-field";
import { GeoJSONFieldWidget } from "./geojson-field";
import { GltfFieldWidget } from "./gltf-field";
import { ImageFieldWidget } from "./image-field";
import { NumberFieldWidget } from "./number-field";
import { SecretFieldWidget } from "./secret-field";
import { TextFieldWidget } from "./text-field";
import type { FieldWidgetProps } from "./types";

export interface FieldWidgetRouterProps extends FieldWidgetProps {
  createObjectUrl?: (objectReference: any) => string;
}

export function FieldWidget(props: FieldWidgetRouterProps) {
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

  const handleBufferGeometryUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      setIsUploading(true);

      const mimeType = "application/x-buffer-geometry";
      const arrayBuffer = await file.arrayBuffer();
      const reference = await uploadBinaryData(arrayBuffer, mimeType);
      props.onChange(reference);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload geometry"
      );
    }
  };

  // Route to appropriate widget based on input type
  switch (input.type) {
    case "boolean":
      return <BooleanFieldWidget {...props} />;
    case "number":
      return <NumberFieldWidget {...props} />;
    case "string":
    case "json":
      return <TextFieldWidget {...props} />;
    case "secret":
      return <SecretFieldWidget {...props} />;
    case "image":
      return (
        <ImageFieldWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleImageUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "document":
      return (
        <DocumentFieldWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleDocumentUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "audio":
      return (
        <AudioFieldWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleAudioUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "gltf":
      return (
        <GltfFieldWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleGltfUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "buffergeometry":
      return (
        <BufferGeometryFieldWidget
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleBufferGeometryUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "point":
    case "multipoint":
    case "linestring":
    case "multilinestring":
    case "polygon":
    case "multipolygon":
    case "geometry":
    case "geometrycollection":
    case "feature":
    case "featurecollection":
    case "geojson":
      return <GeoJSONFieldWidget {...props} />;
    case "any":
      return <AnyFieldWidget {...props} createObjectUrl={createObjectUrl} />;
    default:
      return <GenericFieldWidget {...props} />;
  }
}
