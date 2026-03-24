/**
 * Abstract schema access for workflow nodes.
 *
 * Resolves a schema ID to its field definitions, hiding ownership
 * verification behind a simple resolve call. Nodes use the returned
 * Schema to validate and coerce data at runtime.
 */

import type { Schema } from "@dafthunk/types";

export interface SchemaService {
  /**
   * Verifies that the schema belongs to the organization and returns
   * the schema definition. Returns undefined if the schema is not
   * found or access is denied.
   */
  resolve(
    schemaId: string,
    organizationId: string
  ): Promise<Schema | undefined>;
}
