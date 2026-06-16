import type { NodeType, Parameter } from "./workflow";

/**
 * Response for getting all available node types
 */
export interface GetNodeTypesResponse {
  nodeTypes: NodeType[];
}

/**
 * Field types
 */
export type FieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "datetime"
  | "json";

/**
 * Pattern for valid identifier names (schema names, field names).
 * Must start with a letter or underscore, followed by letters, digits, or underscores.
 * Valid: firstName, first_name, FIRSTNAME
 * Invalid: first-name, "first name", 123abc
 */
export const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Field definition
 */
export interface Field {
  name: string;
  type: FieldType;
  required?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  label?: string;
  defaultValue?: string;
  unique?: boolean;
  references?: string;
}

/**
 * Schema definition
 */
export interface Schema {
  id?: string;
  name: string;
  description?: string;
  fields: Field[];
}

/**
 * Table with schema and data
 */
export interface Table {
  schema: Schema;
  data: Record<string, unknown>[];
}

/**
 * Response from the Replicate model schema endpoint
 */
export interface ReplicateModelSchema {
  model: string;
  version: string;
  description?: string;
  inputs: Parameter[];
  outputs: Parameter[];
}

/**
 * Response from the Cloudflare Gateway (unified `author/model`) schema endpoint.
 * `requiresUploadUrl` is true for file-output models (e.g. video generation)
 * whose input schema declares an `output.upload_url` field — the runtime then
 * presigns an R2 upload URL instead of expecting the file inline.
 */
export interface CloudflareGatewayModelSchema {
  model: string;
  description?: string;
  requiresUploadUrl: boolean;
  inputs: Parameter[];
  outputs: Parameter[];
}

/**
 * Response from the Cloudflare Workers AI model schema endpoint
 */
export interface CloudflareModelSchema {
  model: string;
  inputs: Parameter[];
  outputs: Parameter[];
}

/**
 * A model entry returned by the Cloudflare Workers AI models search endpoint
 */
export interface CloudflareModelInfo {
  id: string;
  name: string;
  description?: string;
  task?: { id: string; name: string };
}
