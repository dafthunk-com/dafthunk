// Database Types
export interface CreateDatabaseRequest {
  name: string;
}

export interface CreateDatabaseResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetDatabaseResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListDatabasesResponse {
  databases: {
    id: string;
    name: string;
    handle: string;
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
  handle: string;
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
