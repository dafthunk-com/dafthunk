import { useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AnyField } from "./any-field";
import { AudioField } from "./audio-field";
import { BooleanField } from "./boolean-field";
import { BufferGeometryField } from "./buffergeometry-field";
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
      return <BooleanField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "string":
      return <TextField {...props} />;
    case "json":
      return <JsonField {...props} />;
    case "secret":
      return <SecretField {...props} />;
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
    case "buffergeometry":
      return (
        <BufferGeometryField
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
      return <GeoJSONField {...props} />;
    case "any":
      return <AnyField {...props} createObjectUrl={createObjectUrl} />;
    default:
      return <GenericField {...props} />;
  }
}
