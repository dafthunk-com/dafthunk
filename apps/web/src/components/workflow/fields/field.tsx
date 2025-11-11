import { useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AnyField } from "./any-field";
import { AudioField } from "./audio-field";
import { BlobField } from "./blob-field";
import { BooleanField } from "./boolean-field";
import { DateField } from "./date-field";
import { DocumentField } from "./document-field";
import {
  createFileUploadHandler,
  fileValidators,
  mimeTypeDetectors,
} from "./file-upload-handler";
import { GenericField } from "./generic-field";
import { GeoJSONField } from "./geojson-field";
import { GltfField } from "./gltf-field";
import { ImageField } from "./image-field";
import { JsonField } from "./json-field";
import { NumberField } from "./number-field";
import { SecretField } from "./secret-field";
import { TextField } from "./text-field";
import type { FieldProps, ObjectReference } from "./types";

export interface FieldRouterProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function Field(props: FieldRouterProps) {
  const { parameter, createObjectUrl } = props;
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

  const handleBlobUpload = createFileUploadHandler(
    {
      errorMessage: "Failed to upload file",
    },
    uploadBinaryData,
    props.onChange,
    setIsUploading,
    setUploadError
  );

  // Route to appropriate widget based on parameter type
  switch (parameter.type) {
    case "boolean":
      return <BooleanField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "string":
      return <TextField {...props} />;
    case "date":
      return <DateField {...props} />;
    case "json":
      return <JsonField {...props} />;
    case "secret":
      return <SecretField {...props} />;
    case "blob":
      return (
        <BlobField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleBlobUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "image":
      return (
        <ImageField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleImageUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "document":
      return (
        <DocumentField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleDocumentUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "audio":
      return (
        <AudioField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleAudioUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "gltf":
      return (
        <GltfField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleGltfUpload}
          createObjectUrl={createObjectUrl}
        />
      );
    case "geojson":
      return <GeoJSONField {...props} />;
    case "any":
      return <AnyField {...props} createObjectUrl={createObjectUrl} />;
    default:
      return <GenericField {...props} />;
  }
}
