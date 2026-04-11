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
 * Field definition
 */
export interface Field {
  name: string;
  type: FieldType;
  required?: boolean;
  primaryKey?: boolean;
  label?: string;
  defaultValue?: string;
  unique?: boolean;
  references?: string;
}

/**
 * Schema definition
 */
export interface Schema {
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
  inputs: Parameter[];
  outputs: Parameter[];
}
