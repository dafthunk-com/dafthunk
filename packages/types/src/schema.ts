import type { Field } from "./types";

export interface SchemaEntity {
  id: string;
  name: string;
  description: string;
  fields: Field[];
  createdAt: string;
  updatedAt: string;
}

export interface ListSchemasResponse {
  schemas: SchemaEntity[];
}

export interface GetSchemaResponse {
  schema: SchemaEntity;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  fields: Field[];
}

export interface CreateSchemaResponse {
  schema: SchemaEntity;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  fields?: Field[];
}

export interface UpdateSchemaResponse {
  schema: SchemaEntity;
}

export interface DeleteSchemaResponse {
  success: boolean;
}
