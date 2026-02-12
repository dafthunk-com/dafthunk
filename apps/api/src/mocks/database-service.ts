import type {
  DatabaseConnection,
  DatabaseService,
  QueryResult,
} from "@dafthunk/runtime";

/**
 * In-memory DatabaseConnection for testing.
 * Returns empty results by default.
 */
class MockDatabaseConnection implements DatabaseConnection {
  async query(_sql: string, _params?: unknown[]): Promise<QueryResult> {
    return { results: [] };
  }

  async execute(_sql: string, _params?: unknown[]): Promise<QueryResult> {
    return { results: [], meta: { rowsAffected: 0 } };
  }
}

/**
 * Mock DatabaseService for testing.
 * Resolves any database ID to an in-memory connection.
 */
export class MockDatabaseService implements DatabaseService {
  async resolve(
    _databaseIdOrHandle: string,
    _organizationId: string
  ): Promise<DatabaseConnection | undefined> {
    return new MockDatabaseConnection();
  }
}
