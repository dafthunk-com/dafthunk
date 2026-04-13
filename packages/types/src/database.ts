// Database Types
export interface CreateDatabaseRequest {
  name: string;
}

export interface CreateDatabaseResponse {
  id: string;
  name: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface GetDatabaseResponse {
  id: string;
  name: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ListDatabasesResponse {
  databases: {
    id: string;
    name: string;

    createdAt: Date;
    updatedAt: Date;
  }[];
}

export interface UpdateDatabaseRequest {
  name: string;
}

export interface UpdateDatabaseResponse {
  id: string;
  name: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteDatabaseResponse {
  id: string;
}

// Query Types
export interface DatabaseQueryRequest {
  sql: string;
  params?: unknown[];
}

export interface DatabaseQueryResponse {
  results: unknown[];
  meta?: {
    rowsAffected?: number;
    lastInsertRowid?: number;
  };
}

// Schema Introspection Types
export interface DatabaseSchemaColumn {
  name: string;
  type: string;
  notnull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
}

export interface DatabaseSchemaForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface DatabaseSchemaTable {
  name: string;
  columns: DatabaseSchemaColumn[];
  foreignKeys: DatabaseSchemaForeignKey[];
}

export interface DatabaseSchemaResponse {
  tables: DatabaseSchemaTable[];
}
