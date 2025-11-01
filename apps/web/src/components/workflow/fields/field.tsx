import { useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AnyFieldWidget } from "./any-field";
import { AudioFieldWidget } from "./audio-field";
import { BooleanFieldWidget } from "./boolean-field";
import { BufferGeometryFieldWidget } from "./buffergeometry-field";
import { DocumentFieldWidget } from "./document-field";
import {
  createFileUploadHandler,
  fileValidators,
  mimeTypeDetectors,
} from "./file-upload-handler";
import { GenericFieldWidget } from "./generic-field";
import { GeoJSONFieldWidget } from "./geojson-field";
import { GltfFieldWidget } from "./gltf-field";
import { ImageFieldWidget } from "./image-field";
import { JsonFieldWidget } from "./json-field";
import { NumberFieldWidget } from "./number-field";
import { SecretFieldWidget } from "./secret-field";
import { TextFieldWidget } from "./text-field";
import type { FieldWidgetProps, ObjectReference } from "./types";

export interface FieldWidgetRouterProps extends FieldWidgetProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
  previewable?: boolean;
}

export function FieldWidget(props: FieldWidgetRouterProps) {
  const { input, createObjectUrl } = props;
  const { uploadBinaryData } = useObjectService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Create upload handlers using the factory
  const handleImageUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.image,
      errorMessage: "Failed to upload image",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  const handleAudioUpload = createFileUploadHandler(
    {
      validateFile: fileValidators.audio,
      errorMessage: "Failed to upload audio",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  const handleDocumentUpload = createFileUploadHandler(
    {
      getMimeType: mimeTypeDetectors.document,
      errorMessage: "Failed to upload document",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  const handleGltfUpload = createFileUploadHandler(
    {
      getMimeType: mimeTypeDetectors.gltf,
      errorMessage: "Failed to upload glTF model",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  const handleBufferGeometryUpload = createFileUploadHandler(
    {
      getMimeType: mimeTypeDetectors.bufferGeometry,
      errorMessage: "Failed to upload geometry",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  // Route to appropriate widget based on input type
  switch (input.type) {
    case "boolean":
      return <BooleanFieldWidget {...props} />;
    case "number":
      return <NumberFieldWidget {...props} />;
    case "string":
      return <TextFieldWidget {...props} />;
    case "json":
      return <JsonFieldWidget {...props} />;
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
