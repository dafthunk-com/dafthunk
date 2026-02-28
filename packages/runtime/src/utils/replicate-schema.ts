import type { Parameter } from "@dafthunk/types";

/**
 * JSON Schema property from Replicate's OpenAPI schema
 */
interface JsonSchemaProperty {
  $ref?: string;
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: string | number | boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  "x-order"?: number;
  items?: JsonSchemaProperty;
  allOf?: JsonSchemaProperty[];
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
  properties?: Record<string, JsonSchemaProperty>;
}

/**
 * Input schema from Replicate's OpenAPI spec
 * Located at openapi_schema.components.schemas.Input
 */
interface ReplicateInputSchema {
  type?: string;
  title?: string;
  required?: string[];
  properties?: Record<string, JsonSchemaProperty>;
}

/**
 * Output schema from Replicate's OpenAPI spec
 * Located at openapi_schema.components.schemas.Output
 */
type ReplicateOutputSchema = JsonSchemaProperty;

export interface ReplicateOpenApiSchema {
  components?: {
    schemas?: {
      Input?: ReplicateInputSchema;
      Output?: ReplicateOutputSchema;
      [key: string]: JsonSchemaProperty | ReplicateInputSchema | undefined;
    };
  };
}

interface MappedSchema {
  inputs: Parameter[];
  outputs: Parameter[];
}

/** All named schemas from components.schemas, used for $ref resolution. */
type SchemaMap = Record<string, JsonSchemaProperty>;

const BLOB_TYPE_KEYWORDS: Record<string, "image" | "audio" | "video"> = {
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
  animation: "video",
};

/**
 * Detect blob subtype (image/audio/video) from property name and description.
 * Falls back to "blob" if no heuristic matches.
 */
function detectBlobType(
  name: string,
  description?: string
): "image" | "audio" | "video" | "blob" {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  for (const [keyword, blobType] of Object.entries(BLOB_TYPE_KEYWORDS)) {
    if (text.includes(keyword)) {
      return blobType;
    }
  }
  return "blob";
}

/**
 * Look up a local $ref (e.g. "#/components/schemas/PredictOutput") in the schema map.
 */
function resolveRef(
  ref: string,
  schemas: SchemaMap
): JsonSchemaProperty | undefined {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (!match) return undefined;
  return schemas[match[1]];
}

/**
 * Fully resolve a schema property: dereference $ref, merge allOf, unwrap nullable anyOf/oneOf.
 * This handles the three most common Replicate schema patterns in order.
 */
function resolveSchema(
  prop: JsonSchemaProperty,
  schemas: SchemaMap
): JsonSchemaProperty {
  // 1. Dereference $ref — e.g. Output: { "$ref": "#/components/schemas/PredictOutput" }
  let resolved = prop;
  if (resolved.$ref) {
    const deref = resolveRef(resolved.$ref, schemas);
    if (deref) {
      resolved = { ...deref };
      // Preserve outer description/title if the target doesn't have one
      if (!resolved.description && prop.description)
        resolved.description = prop.description;
      if (!resolved.title && prop.title) resolved.title = prop.title;
    }
  }

  // 2. Merge allOf — e.g. { allOf: [{ type: "string", enum: [...] }] }
  if (resolved.allOf) {
    const merged = { ...resolved };
    delete merged.allOf;
    for (const item of resolved.allOf) {
      Object.assign(merged, item);
    }
    resolved = merged;
  }

  // 3. Unwrap nullable anyOf/oneOf — e.g. { anyOf: [{ type: "null" }, { ...actual }] }
  const alternatives = resolved.anyOf ?? resolved.oneOf;
  if (alternatives) {
    const nonNull = alternatives.find((alt) => alt.type !== "null");
    if (nonNull) {
      const merged = { ...resolved };
      delete merged.anyOf;
      delete merged.oneOf;
      Object.assign(merged, nonNull);
      if (prop.description && !nonNull.description)
        merged.description = prop.description;
      if (prop.title && !nonNull.title) merged.title = prop.title;
      resolved = merged;
    }
  }

  return resolved;
}

/**
 * Map a single JSON Schema property to a Dafthunk Parameter.
 */
function mapProperty(
  name: string,
  rawProp: JsonSchemaProperty,
  required: boolean,
  schemas: SchemaMap
): Parameter {
  const prop = resolveSchema(rawProp, schemas);
  const description = prop.description ?? prop.title;

  // URI strings → detect blob type
  // Cast needed: detectBlobType returns a dynamic discriminant that TS can't narrow
  if (prop.type === "string" && prop.format === "uri") {
    const blobType = detectBlobType(name, description);
    return {
      name,
      type: blobType,
      description,
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    } as Parameter;
  }

  // Enum strings
  if (prop.type === "string" && prop.enum) {
    const enumDescription = description
      ? `${description} (options: ${prop.enum.join(", ")})`
      : `Options: ${prop.enum.join(", ")}`;
    return {
      name,
      type: "string",
      description: enumDescription,
      value: prop.default !== undefined ? String(prop.default) : prop.enum[0],
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Plain strings
  if (prop.type === "string") {
    return {
      name,
      type: "string",
      description,
      ...(prop.default !== undefined ? { value: String(prop.default) } : {}),
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Numbers and integers
  if (prop.type === "integer" || prop.type === "number") {
    return {
      name,
      type: "number",
      description,
      ...(prop.default !== undefined ? { value: Number(prop.default) } : {}),
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Booleans
  if (prop.type === "boolean") {
    return {
      name,
      type: "boolean",
      description,
      ...(prop.default !== undefined ? { value: Boolean(prop.default) } : {}),
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Objects
  if (prop.type === "object") {
    return {
      name,
      type: "json",
      description,
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Arrays (of URIs → blob; otherwise → json)
  // Cast needed: detectBlobType returns a dynamic discriminant that TS can't narrow
  if (prop.type === "array") {
    if (prop.items?.format === "uri") {
      const blobType = detectBlobType(name, description);
      return {
        name,
        type: blobType,
        description,
        required: required && prop.default === undefined,
        hidden: !required || prop.default !== undefined,
      } as Parameter;
    }
    return {
      name,
      type: "json",
      description,
      required: required && prop.default === undefined,
      hidden: !required || prop.default !== undefined,
    };
  }

  // Fallback: treat as string
  return {
    name,
    type: "string",
    description,
    required: required && prop.default === undefined,
    hidden: !required || prop.default !== undefined,
  };
}

/**
 * Map Replicate's output schema to Dafthunk output parameters.
 * Uses model-level description as additional context for blob type detection,
 * since the output schema's own description is often empty or generic.
 */
function mapOutputSchema(
  schema: ReplicateOutputSchema | undefined,
  modelDescription: string | undefined,
  schemas: SchemaMap
): Parameter[] {
  if (!schema) {
    return [{ name: "output", type: "any" }];
  }

  // Fully resolve: $ref → allOf → anyOf/oneOf nullable unwrap
  const resolved = resolveSchema(schema, schemas);

  // Combine output schema description with model description for better detection
  const detectionContext = [resolved.description, modelDescription]
    .filter(Boolean)
    .join(" ");

  // Cast needed: detectBlobType returns a dynamic discriminant that TS can't narrow

  // URI string → single blob output
  if (resolved.type === "string" && resolved.format === "uri") {
    const blobType = detectBlobType("output", detectionContext);
    return [
      { name: "output", type: blobType, description: resolved.description },
    ] as Parameter[];
  }

  // Array of URIs → single blob output (take first element at runtime)
  if (
    resolved.type === "array" &&
    resolved.items?.type === "string" &&
    resolved.items?.format === "uri"
  ) {
    const blobType = detectBlobType("output", detectionContext);
    return [
      { name: "output", type: blobType, description: resolved.description },
    ] as Parameter[];
  }

  // Plain string → string output
  if (resolved.type === "string") {
    return [
      { name: "output", type: "string", description: resolved.description },
    ];
  }

  // Object with named properties → multiple named outputs (e.g. Trellis 2)
  if (resolved.type === "object" && resolved.properties) {
    return Object.entries(resolved.properties).map(([name, prop]) => {
      const r = resolveSchema(prop, schemas);
      const desc = r.description ?? r.title;
      if (r.type === "string" && r.format === "uri") {
        const blobType = detectBlobType(name, desc);
        return { name, type: blobType, description: desc } as Parameter;
      }
      return { name, type: "string", description: desc };
    });
  }

  // Object without named properties → json output
  if (resolved.type === "object") {
    return [
      { name: "output", type: "json", description: resolved.description },
    ];
  }

  // Fallback
  return [{ name: "output", type: "any", description: resolved.description }];
}

/**
 * Convert a Replicate model's OpenAPI schema into Dafthunk Parameters.
 *
 * @param openApiSchema - The model's `openapi_schema` from the Replicate API
 * @param modelDescription - The model's top-level description, used to detect output blob types
 * @returns Mapped inputs and outputs as Dafthunk Parameter arrays
 */
export function mapReplicateSchema(
  openApiSchema: ReplicateOpenApiSchema,
  modelDescription?: string
): MappedSchema {
  const inputSchema = openApiSchema?.components?.schemas?.Input;
  const outputSchema = openApiSchema?.components?.schemas?.Output;

  // Build a flat schema map for $ref resolution (all named schemas except Input)
  const schemas = (openApiSchema?.components?.schemas ?? {}) as SchemaMap;

  if (!inputSchema?.properties) {
    return {
      inputs: [],
      outputs: mapOutputSchema(outputSchema, modelDescription, schemas),
    };
  }

  const requiredSet = new Set(inputSchema.required ?? []);
  const entries = Object.entries(inputSchema.properties);

  // Sort by x-order, then by name for stability
  entries.sort(([nameA, propA], [nameB, propB]) => {
    const orderA = propA["x-order"] ?? Number.MAX_SAFE_INTEGER;
    const orderB = propB["x-order"] ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return nameA.localeCompare(nameB);
  });

  const inputs = entries.map(([name, prop]) =>
    mapProperty(name, prop, requiredSet.has(name), schemas)
  );

  return {
    inputs,
    outputs: mapOutputSchema(outputSchema, modelDescription, schemas),
  };
}
