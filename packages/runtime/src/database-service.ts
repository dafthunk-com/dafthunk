/**
 * Abstract database access for workflow nodes.
 *
 * Hides ownership verification and connection routing behind a simple
 * resolve → query/execute flow. Nodes never touch D1 or Durable Objects
 * directly — they receive a pre-bound DatabaseConnection scoped to the
 * resolved database.
 */

export interface QueryResult {
  results: unknown[];
  meta?: {
    rowsAffected?: number;
    lastInsertRowid?: number;
  };
}

export interface DatabaseConnection {
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
}

export interface DatabaseService {
  /**
   * Verifies that the database belongs to the organization and returns
   * a connection scoped to that database. Returns undefined if the
   * database is not found or access is denied.
   */
  resolve(
    databaseIdOrHandle: string,
    organizationId: string
  ): Promise<DatabaseConnection | undefined>;
}
