/**
 * Runtime Ports - Interface Definitions
 *
 * This module defines the interfaces (ports) that the runtime depends on.
 * Implementations (adapters) live in stores/ and services/ directories.
 *
 * Architecture: Dependency Inversion Principle
 * - Runtime defines what it needs (interfaces)
 * - Stores/Services provide implementations
 * - Dependency arrow points toward runtime, not away from it
 */

import type {
  ExecutionStatusType,
  NodeExecution,
  ObjectReference,
  WorkflowExecution,
} from "@dafthunk/types";

// =============================================================================
// EXECUTION STORE
// =============================================================================

/**
 * Execution metadata row structure.
 * Represents the minimal metadata stored for quick queries.
 */
export interface ExecutionRow {
  id: string;
  workflowId: string;
  deploymentId: string | null;
  organizationId: string;
  status: ExecutionStatusType;
  error: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  usage: number;
}

/**
 * Data required to save an execution record.
 */
export interface SaveExecutionRecord {
  id: string;
  workflowId: string;
  deploymentId?: string;
  userId: string;
  organizationId: string;
  status: ExecutionStatusType;
  nodeExecutions: NodeExecution[];
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
}

/**
 * Options for listing executions.
 */
export interface ListExecutionsOptions {
  workflowId?: string;
  deploymentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Interface for execution storage operations.
 * Handles saving, retrieving, and listing workflow executions.
 */
export interface ExecutionStore {
  /**
   * Save execution metadata and full data.
   */
  save(record: SaveExecutionRecord): Promise<WorkflowExecution>;

  /**
   * Get execution metadata by ID.
   */
  get(id: string, organizationId: string): Promise<ExecutionRow | undefined>;

  /**
   * Get execution metadata and full data by ID.
   */
  getWithData(
    id: string,
    organizationId: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined>;

  /**
   * List executions with optional filtering and pagination.
   */
  list(
    organizationId: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]>;
}

// =============================================================================
// OBJECT STORE
// =============================================================================

/**
 * Configuration for generating presigned URLs.
 */
export interface PresignedUrlConfig {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Information about a stored object.
 */
export interface ObjectInfo {
  id: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  organizationId: string;
  executionId?: string;
}

/**
 * Interface for object storage operations.
 * Handles writing, reading, and managing binary objects.
 */
export interface ObjectStore {
  /**
   * Write an object with auto-generated ID.
   */
  writeObject(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference>;

  /**
   * Write an object with a specific ID.
   */
  writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference>;

  /**
   * Read an object by reference.
   */
  readObject(reference: ObjectReference): Promise<{
    data: Uint8Array;
    metadata: Record<string, string>;
  } | null>;

  /**
   * Delete an object by reference.
   */
  deleteObject(reference: ObjectReference): Promise<void>;

  /**
   * Generate a presigned URL for downloading an object.
   */
  getPresignedUrl(
    reference: ObjectReference,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Generate a presigned URL for uploading an object.
   */
  getPresignedUploadUrl(
    reference: ObjectReference,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * List all objects for an organization.
   */
  listObjects(organizationId: string): Promise<ObjectInfo[]>;

  /**
   * Configure S3-compatible credentials for generating presigned URLs.
   */
  configurePresignedUrls(config: PresignedUrlConfig): void;
}

// =============================================================================
// MONITORING SERVICE
// =============================================================================

/**
 * Service for sending workflow execution monitoring updates.
 * Provides an abstraction over the underlying communication mechanism.
 */
export interface MonitoringService {
  /**
   * Sends an execution update to the specified session.
   * @param sessionId - Optional session identifier. No-op if undefined.
   * @param execution - The execution record to send.
   */
  sendUpdate(
    sessionId: string | undefined,
    execution: WorkflowExecution
  ): Promise<void>;
}
