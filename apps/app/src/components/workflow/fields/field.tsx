import { useCallback, useRef, useState } from "react";

import { useObjectService } from "@/services/object-service";

import { AnyField } from "./any-field";
import { AudioField } from "./audio-field";
import { BlobField } from "./blob-field";
import { BooleanField } from "./boolean-field";
import { DatabaseField } from "./database-field";
import { DatasetField } from "./dataset-field";
import { DateField } from "./date-field";
import { DiscordBotField } from "./discord-bot-field";
import { DocumentField } from "./document-field";
import { EmailField } from "./email-field";
import {
  createFileUploadHandler,
  fileValidators,
  mimeTypeDetectors,
} from "./file-upload-handler";
import { GenericField } from "./generic-field";
import { GeoJSONField } from "./geojson-field";
import { GltfField } from "./gltf-field";
import { ImageField } from "./image-field";
import { IntegrationField } from "./integration-field";
import { JsonField } from "./json-field";
import { NumberField } from "./number-field";
import { QueueField } from "./queue-field";
import { SecretField } from "./secret-field";
import { TelegramBotField } from "./telegram-bot-field";
import { TextField } from "./text-field";
import type { FieldProps, ObjectReference } from "./types";
import { VideoField } from "./video-field";

export interface FieldRouterProps extends FieldProps {
  createObjectUrl?: (objectReference: ObjectReference) => string;
}

export function Field(props: FieldRouterProps) {
  const { parameter, createObjectUrl } = props;
  const { uploadBinaryData } = useObjectService();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Use ref for onChange to avoid stale closures in async upload handlers
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const stableOnChange = useCallback(
    (...args: Parameters<typeof props.onChange>) =>
      onChangeRef.current(...args),
    []
  );

  // Create upload handlers using the factory
  const handleImageUpload = useCallback(
    createFileUploadHandler(
      {
        validateFile: fileValidators.image,
        errorMessage: "Failed to upload image",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  const handleAudioUpload = useCallback(
    createFileUploadHandler(
      {
        validateFile: fileValidators.audio,
        errorMessage: "Failed to upload audio",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  const handleDocumentUpload = useCallback(
    createFileUploadHandler(
      {
        getMimeType: mimeTypeDetectors.document,
        errorMessage: "Failed to upload document",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  const handleGltfUpload = useCallback(
    createFileUploadHandler(
      {
        getMimeType: mimeTypeDetectors.gltf,
        errorMessage: "Failed to upload glTF model",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  const handleVideoUpload = useCallback(
    createFileUploadHandler(
      {
        validateFile: fileValidators.video,
        errorMessage: "Failed to upload video",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
  );

  const handleBlobUpload = useCallback(
    createFileUploadHandler(
      {
        errorMessage: "Failed to upload file",
      },
      uploadBinaryData,
      stableOnChange,
      setIsUploading,
      setUploadError
    ),
    [uploadBinaryData, stableOnChange]
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
    case "database":
      return <DatabaseField {...props} />;
    case "dataset":
      return <DatasetField {...props} />;
    case "queue":
      return <QueueField {...props} />;
    case "email":
      return <EmailField {...props} />;
    case "discord":
      return <DiscordBotField {...props} />;
    case "telegram":
      return <TelegramBotField {...props} />;
    case "integration":
      return <IntegrationField {...props} />;
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
    case "video":
      return (
        <VideoField
          {...props}
          isUploading={isUploading}
          uploadError={uploadError}
          onFileUpload={handleVideoUpload}
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
