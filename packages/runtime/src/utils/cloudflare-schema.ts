import type { Parameter } from "@dafthunk/types";

/**
 * JSON Schema property from Cloudflare Workers AI model schemas.
 *
 * @see https://developers.cloudflare.com/api/node/resources/ai/subresources/models/subresources/schema
 */
export interface CloudflareJsonSchema {
  type?: string;
  title?: string;
  description?: string;
  default?: string | number | boolean;
  enum?: string[];
  format?: string;
  contentType?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  required?: string[];
  properties?: Record<string, CloudflareJsonSchema>;
  items?: CloudflareJsonSchema;
  oneOf?: CloudflareJsonSchema[];
  anyOf?: CloudflareJsonSchema[];
  allOf?: CloudflareJsonSchema[];
}

/**
 * Top-level schema returned by the Cloudflare model schema endpoint.
 */
export interface CloudflareModelOpenApiSchema {
  input?: CloudflareJsonSchema;
  output?: CloudflareJsonSchema;
}

interface MappedSchema {
  inputs: Parameter[];
  outputs: Parameter[];
}

const BLOB_KEYWORDS: Record<string, "image" | "audio" | "video"> = {
  image: "image",
  img: "image",
  photo: "image",
  picture: "image",
  mask: "image",
  audio: "audio",
  sound: "audio",
  music: "audio",
  speech: "audio",
  voice: "audio",
  video: "video",
  clip: "video",
};

/**
 * Detect the blob subtype for a named parameter from its name and description.
 * Falls back to generic "blob" when no heuristic matches.
 */
function detectBlobType(
  name: string,
  description?: string
): "image" | "audio" | "video" | "blob" {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  for (const [keyword, blobType] of Object.entries(BLOB_KEYWORDS)) {
    if (text.includes(keyword)) return blobType;
  }
  return "blob";
}

/**
 * Infer a blob subtype from an output schema's contentType (e.g. "image/png").
 */
function blobTypeFromContentType(
  contentType: string | undefined
): "image" | "audio" | "video" | "blob" {
  if (!contentType) return "blob";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  return "blob";
}

/**
 * Collapse allOf, anyOf, oneOf into a single schema. For anyOf/oneOf we pick
 * the first non-binary object branch — Cloudflare commonly wraps blob inputs
 * like `{ oneOf: [ binary, { object with blob property } ] }` and we always
 * use the object form from our runtime.
 */
function resolveSchema(schema: CloudflareJsonSchema): CloudflareJsonSchema {
  if (schema.allOf) {
    const merged: CloudflareJsonSchema = { ...schema };
    delete merged.allOf;
    for (const item of schema.allOf) Object.assign(merged, resolveSchema(item));
    return merged;
  }

  const alternatives = schema.oneOf ?? schema.anyOf;
  if (alternatives && alternatives.length > 0) {
    const objectBranch = alternatives.find(
      (alt) => alt.type === "object" || alt.properties
    );
    const nonNull = alternatives.find((alt) => alt.type !== "null");
    const chosen = objectBranch ?? nonNull ?? alternatives[0];
    const merged: CloudflareJsonSchema = { ...schema };
    delete merged.oneOf;
    delete merged.anyOf;
    Object.assign(merged, resolveSchema(chosen));
    return merged;
  }

  return schema;
}

/**
 * True when a schema describes a byte array ({ type: "array", items: { type: "number" } }).
 * Cloudflare uses this shape for blob inputs like audio or image data.
 */
function isByteArray(schema: CloudflareJsonSchema): boolean {
  return schema.type === "array" && schema.items?.type === "number";
}

/**
 * True when a schema describes a base64-encoded string. Cloudflare marks
 * these either with `contentType: "application/base64"` or description hints.
 */
function isBase64String(schema: CloudflareJsonSchema): boolean {
  if (schema.type !== "string") return false;
  const contentType = schema.contentType?.toLowerCase() ?? "";
  const description = schema.description?.toLowerCase() ?? "";
  const format = schema.format?.toLowerCase() ?? "";
  return (
    contentType.includes("base64") ||
    format === "base64" ||
    description.includes("base64") ||
    description.includes("base-64")
  );
}

function collectMetadata(
  schema: CloudflareJsonSchema
): Partial<
  Pick<Parameter, "minimum" | "maximum" | "enum" | "format" | "default">
> {
  const meta: Partial<
    Pick<Parameter, "minimum" | "maximum" | "enum" | "format" | "default">
  > = {};
  if (schema.minimum !== undefined) meta.minimum = schema.minimum;
  if (schema.maximum !== undefined) meta.maximum = schema.maximum;
  if (schema.enum) meta.enum = schema.enum;
  if (schema.format) meta.format = schema.format;
  if (schema.default !== undefined) meta.default = schema.default;
  return meta;
}

/**
 * Map a single property from the input schema to a Dafthunk Parameter.
 */
function mapInputProperty(
  name: string,
  rawProp: CloudflareJsonSchema,
  required: boolean
): Parameter {
  const prop = resolveSchema(rawProp);
  const description = prop.description ?? prop.title;
  const meta = collectMetadata(prop);
  const isHidden = !required || prop.default !== undefined;
  const base = { name, description, required, hidden: isHidden, ...meta };

  // Byte array → blob-typed input (runtime converts Uint8Array via Array.from)
  if (isByteArray(prop)) {
    const blobType = detectBlobType(name, description);
    return { ...base, type: blobType } as Parameter;
  }

  // Base64 string whose name suggests blob content (e.g. image_b64)
  if (isBase64String(prop) && /image|audio|video|mask|photo/i.test(name)) {
    const blobType = detectBlobType(name, description);
    return { ...base, type: blobType, format: "base64" } as Parameter;
  }

  if (prop.enum && prop.type === "string") {
    const enumDesc = description
      ? `${description} (options: ${prop.enum.join(", ")})`
      : `Options: ${prop.enum.join(", ")}`;
    return {
      ...base,
      description: enumDesc,
      type: "string",
      value: prop.default !== undefined ? String(prop.default) : prop.enum[0],
    };
  }

  if (prop.type === "string") {
    return {
      ...base,
      type: "string",
      ...(prop.default !== undefined ? { value: String(prop.default) } : {}),
    };
  }

  if (prop.type === "integer" || prop.type === "number") {
    return {
      ...base,
      type: "number",
      ...(prop.default !== undefined ? { value: Number(prop.default) } : {}),
    };
  }

  if (prop.type === "boolean") {
    return {
      ...base,
      type: "boolean",
      ...(prop.default !== undefined ? { value: Boolean(prop.default) } : {}),
    };
  }

  // Arrays of objects, complex objects, unknown types → json passthrough
  if (prop.type === "array" || prop.type === "object") {
    return { ...base, type: "json" };
  }

  return { ...base, type: "string" };
}

/**
 * Map the top-level `input` schema. Cloudflare inputs are either:
 *  - an object with properties (the common case)
 *  - oneOf/anyOf where one branch is a binary string and another is an object
 *    holding a byte-array property (e.g. whisper, resnet-50)
 *  - oneOf with multiple object branches representing alternative call shapes
 *    (e.g. llama: `{prompt}` vs `{messages, tools, ...}`) — we union the
 *    properties so the editor exposes every parameter the model accepts
 *  - a raw binary string (no named properties → we expose a single blob input)
 */
function mapInputSchema(schema: CloudflareJsonSchema | undefined): Parameter[] {
  if (!schema) return [];

  const merged = mergeInputBranches(schema);
  if (merged) {
    const { properties, required } = merged;
    return Object.entries(properties).map(([name, prop]) =>
      mapInputProperty(name, prop, required.has(name))
    );
  }

  const resolved = resolveSchema(schema);

  if (resolved.type === "object" && resolved.properties) {
    const required = new Set(resolved.required ?? []);
    return Object.entries(resolved.properties).map(([name, prop]) =>
      mapInputProperty(name, prop, required.has(name))
    );
  }

  // A bare binary string input (unusual — normal shape is oneOf with object)
  if (resolved.type === "string" && resolved.format === "binary") {
    return [
      {
        name: "input",
        type: "blob",
        description: resolved.description,
        required: true,
      },
    ];
  }

  return [];
}

/**
 * When the top-level input is a `oneOf`/`anyOf` of multiple object branches —
 * Cloudflare's pattern for "use prompt OR messages" — union their properties
 * so the editor exposes the full parameter surface (including function-calling
 * fields like `tools`). A property is treated as required only when every
 * object branch lists it as required. Returns `null` when the schema has at
 * most one object branch (in which case the existing single-branch logic is
 * the right fallback).
 */
function mergeInputBranches(schema: CloudflareJsonSchema): {
  properties: Record<string, CloudflareJsonSchema>;
  required: Set<string>;
} | null {
  const alternatives = schema.oneOf ?? schema.anyOf;
  if (!alternatives) return null;

  const objectBranches = alternatives
    .map(resolveSchema)
    .filter(
      (alt) =>
        (alt.type === "object" || alt.properties) &&
        alt.properties !== undefined
    );
  if (objectBranches.length < 2) return null;

  const properties: Record<string, CloudflareJsonSchema> = {};
  const branchRequired: Set<string>[] = [];
  for (const branch of objectBranches) {
    branchRequired.push(new Set(branch.required ?? []));
    for (const [name, prop] of Object.entries(branch.properties ?? {})) {
      if (!(name in properties)) properties[name] = prop;
    }
  }

  const required = new Set<string>();
  for (const name of Object.keys(properties)) {
    if (branchRequired.every((set) => set.has(name))) required.add(name);
  }
  return { properties, required };
}

/**
 * Map the top-level `output` schema to a list of named output Parameters.
 *
 * Shapes observed:
 *  - `{ type: "string", format: "binary", contentType: "image/png" }` → single blob
 *  - `{ type: "object", properties: { image: base64 string } }` → single blob output
 *  - `{ type: "object", properties: { text, words, vtt, word_count } }` → multi output
 *  - `{ type: "array", items: { ... } }` → single json output
 */
function mapOutputSchema(
  schema: CloudflareJsonSchema | undefined
): Parameter[] {
  if (!schema) return [{ name: "output", type: "any" }];

  const resolved = resolveSchema(schema);

  // Binary stream → single blob output
  if (resolved.type === "string" && resolved.format === "binary") {
    return [
      {
        name: "output",
        type: blobTypeFromContentType(resolved.contentType),
        description: resolved.description,
      } as Parameter,
    ];
  }

  // Object output → one Parameter per property (with blob detection for base64/binary fields)
  if (resolved.type === "object" && resolved.properties) {
    return Object.entries(resolved.properties).map(([name, rawProp]) => {
      const prop = resolveSchema(rawProp);
      const description = prop.description ?? prop.title;

      if (isBase64String(prop) || prop.format === "binary") {
        const blobType = detectBlobType(name, description);
        return {
          name,
          type: blobType,
          description,
          ...(isBase64String(prop) ? { format: "base64" } : {}),
        } as Parameter;
      }

      if (prop.type === "string") {
        return { name, type: "string", description };
      }
      if (prop.type === "integer" || prop.type === "number") {
        return { name, type: "number", description };
      }
      if (prop.type === "boolean") {
        return { name, type: "boolean", description };
      }
      return { name, type: "json", description };
    });
  }

  // Array output → a single json parameter (consumers can iterate)
  if (resolved.type === "array") {
    return [
      { name: "output", type: "json", description: resolved.description },
    ];
  }

  if (resolved.type === "string") {
    return [
      { name: "output", type: "string", description: resolved.description },
    ];
  }

  if (resolved.type === "integer" || resolved.type === "number") {
    return [
      { name: "output", type: "number", description: resolved.description },
    ];
  }

  if (resolved.type === "boolean") {
    return [
      { name: "output", type: "boolean", description: resolved.description },
    ];
  }

  return [{ name: "output", type: "any", description: resolved.description }];
}

/**
 * Convert a Cloudflare Workers AI model schema into Dafthunk Parameters.
 *
 * @param schema - The model schema returned from the Cloudflare API
 * @returns Mapped inputs and outputs as Dafthunk Parameter arrays
 */
export function mapCloudflareSchema(
  schema: CloudflareModelOpenApiSchema
): MappedSchema {
  return {
    inputs: mapInputSchema(schema.input),
    outputs: mapOutputSchema(schema.output),
  };
}
