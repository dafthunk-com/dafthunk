import type { NodeType, Parameter } from "./workflow";

/**
 * Response for getting all available node types
 */
export interface GetNodeTypesResponse {
  nodeTypes: NodeType[];
}

/**
 * Table schema field types
 */
export type TableFieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "datetime"
  | "json";

/**
 * Table schema field definition
 */
export interface TableField {
  name: string;
  type: TableFieldType;
}

/**
 * Table with schema definition and data
 */
export interface Table {
  name: string;
  fields: TableField[];
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
