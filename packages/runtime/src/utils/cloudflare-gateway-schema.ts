import type { Parameter } from "@dafthunk/types";

/**
 * Maps the static JSON Schema documents Cloudflare publishes for unified
 * (`author/model`) gateway models onto Dafthunk Parameters. These schemas are
 * plain JSON Schema (draft 2020-12) fetched from
 * `developers.cloudflare.com/ai/models/<author>/<model>/schema-input.json`
 * (and `schema-output.json`) — not the OpenAPI envelope Workers AI uses, so
 * this mapper is intentionally separate from `cloudflare-schema.ts`.
 *
 * Two shapes are handled that the Workers AI mapper doesn't:
 *  - File inputs are nested `{ url: string }` objects (e.g. `image`, `video`),
 *    and arrays of them (`reference_images`). These map to blob parameters; the
 *    runtime presigns a GET URL and re-wraps the value as `{ url }`.
 *  - File-output models declare a required `output.upload_url`. That field is
 *    not surfaced as a user input — instead `requiresUploadUrl` is set so the
 *    runtime presigns an R2 upload destination and reads the file back.
 */

interface JsonSchema {
  type?: string;
  description?: string;
  title?: string;
  default?: string | number | boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

export interface CloudflareGatewayMappedSchema {
  inputs: Parameter[];
  outputs: Parameter[];
  requiresUploadUrl: boolean;
}

/** Property name carrying the provider upload destination. */
const OUTPUT_FIELD = "output";

const BLOB_TYPE_KEYWORDS: Record<string, "image" | "audio" | "video"> = {
  image: "image",
  img: "image",
  photo: "image",
  picture: "image",
  reference: "image",
  audio: "audio",
  sound: "audio",
  music: "audio",
  speech: "audio",
  voice: "audio",
  video: "video",
  clip: "video",
};

function detectBlobType(name: string): "image" | "audio" | "video" | "blob" {
  const text = name.toLowerCase();
  for (const [keyword, blobType] of Object.entries(BLOB_TYPE_KEYWORDS)) {
    if (text.includes(keyword)) return blobType;
  }
  return "blob";
}

/** A `{ url: string }` object is how Cloudflare models reference file inputs. */
function isUrlObject(schema: JsonSchema): boolean {
  return (
    schema.type === "object" &&
    !!schema.properties?.url &&
    schema.properties.url.type === "string"
  );
}

function collectMetadata(
  prop: JsonSchema
): Partial<Pick<Parameter, "minimum" | "maximum" | "enum" | "default">> {
  const meta: Partial<
    Pick<Parameter, "minimum" | "maximum" | "enum" | "default">
  > = {};
  if (prop.minimum !== undefined) meta.minimum = prop.minimum;
  if (prop.maximum !== undefined) meta.maximum = prop.maximum;
  if (prop.enum) meta.enum = prop.enum;
  if (prop.default !== undefined) meta.default = prop.default;
  return meta;
}

function mapInputProperty(
  name: string,
  prop: JsonSchema,
  required: boolean
): Parameter {
  const description = prop.description ?? prop.title;
  const meta = collectMetadata(prop);

  // File inputs: `{ url }` object → single blob; array of `{ url }` → repeated.
  if (isUrlObject(prop)) {
    return {
      name,
      type: detectBlobType(name),
      description,
      required,
      hidden: true,
      ...meta,
    } as Parameter;
  }
  if (prop.type === "array" && prop.items && isUrlObject(prop.items)) {
    return {
      name,
      type: detectBlobType(name),
      repeated: true,
      description,
      required,
      hidden: true,
      ...meta,
    } as Parameter;
  }

  // Scalars are shown as editable fields (Cloudflare's schemas rarely mark
  // anything required, so hiding non-required inputs would hide `prompt`).
  if (prop.type === "string" && prop.enum) {
    return {
      name,
      type: "string",
      description,
      value: prop.default !== undefined ? String(prop.default) : prop.enum[0],
      required,
      hidden: false,
      ...meta,
    };
  }
  if (prop.type === "string") {
    return {
      name,
      type: "string",
      description,
      ...(prop.default !== undefined ? { value: String(prop.default) } : {}),
      required,
      hidden: false,
      ...meta,
    };
  }
  if (prop.type === "integer" || prop.type === "number") {
    return {
      name,
      type: "number",
      description,
      ...(prop.default !== undefined ? { value: Number(prop.default) } : {}),
      required,
      hidden: false,
      ...meta,
    };
  }
  if (prop.type === "boolean") {
    return {
      name,
      type: "boolean",
      description,
      ...(prop.default !== undefined ? { value: Boolean(prop.default) } : {}),
      required,
      hidden: false,
      ...meta,
    };
  }

  // Objects and everything else fall back to a JSON parameter.
  return {
    name,
    type: "json",
    description,
    required,
    hidden: false,
    ...meta,
  };
}

/**
 * Map an output property. File outputs (video/image/audio by name) become blob
 * outputs — for upload-destination models the bytes are read back from R2; for
 * inline models they're decoded at runtime.
 */
function mapOutputProperty(name: string, prop: JsonSchema): Parameter {
  const description = prop.description ?? prop.title;
  const blobType = detectBlobType(name);
  if (blobType !== "blob" || isUrlObject(prop)) {
    return { name, type: blobType, description } as Parameter;
  }
  if (prop.type === "string") return { name, type: "string", description };
  if (prop.type === "integer" || prop.type === "number")
    return { name, type: "number", description };
  if (prop.type === "boolean") return { name, type: "boolean", description };
  return { name, type: "json", description };
}

export function mapCloudflareGatewaySchema(
  inputSchema: JsonSchema | undefined,
  outputSchema: JsonSchema | undefined
): CloudflareGatewayMappedSchema {
  let requiresUploadUrl = false;
  const inputs: Parameter[] = [];

  const inputProps = inputSchema?.properties ?? {};
  const requiredSet = new Set(inputSchema?.required ?? []);
  for (const [name, prop] of Object.entries(inputProps)) {
    // The provider upload destination is handled by the runtime, not the user.
    if (name === OUTPUT_FIELD && prop.properties?.upload_url) {
      requiresUploadUrl = true;
      continue;
    }
    inputs.push(mapInputProperty(name, prop, requiredSet.has(name)));
  }

  const outputProps = outputSchema?.properties ?? {};
  const outputs: Parameter[] = Object.entries(outputProps).map(([name, prop]) =>
    mapOutputProperty(name, prop)
  );
  if (outputs.length === 0) {
    outputs.push({ name: "output", type: "any" });
  }

  return { inputs, outputs, requiresUploadUrl };
}
