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
import { GenericField } from "./generic-field";
import { GeoJSONField } from "./geojson-field";
import { GltfField } from "./gltf-field";
import { ImageField } from "./image-field";
import { IntegrationField } from "./integration-field";
import { JsonField } from "./json-field";
import { NumberField } from "./number-field";
import { QueueField } from "./queue-field";
import { SchemaField } from "./schema-field";
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
    case "schema":
      return <SchemaField {...props} />;
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
      return <BlobField {...props} createObjectUrl={createObjectUrl} />;
    case "image":
      return <ImageField {...props} createObjectUrl={createObjectUrl} />;
    case "document":
      return <DocumentField {...props} createObjectUrl={createObjectUrl} />;
    case "audio":
      return <AudioField {...props} createObjectUrl={createObjectUrl} />;
    case "video":
      return <VideoField {...props} createObjectUrl={createObjectUrl} />;
    case "gltf":
      return <GltfField {...props} createObjectUrl={createObjectUrl} />;
    case "geojson":
      return <GeoJSONField {...props} />;
    case "any":
      return <AnyField {...props} createObjectUrl={createObjectUrl} />;
    default:
      return <GenericField {...props} />;
  }
}
