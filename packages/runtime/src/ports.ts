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
 *
 * This file is designed to have ZERO external dependencies except @dafthunk/types,
 * making it extractable to a separate package.
 */

import type {
  ExecutionStatusType,
  Node,
  NodeExecution,
  NodeType,
  ObjectReference,
  ParameterValue as ApiParameterValue,
  QueueMessage,
  ScheduledTrigger,
  Workflow,
  WorkflowExecution,
  WorkflowMode,
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

// =============================================================================
// NODE CONTEXT & TRIGGERS
// =============================================================================

/**
 * HTTP request data available to trigger nodes.
 */
export interface HttpRequest {
  url?: string;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: BlobParameter;
}

/**
 * Email message data available to email trigger nodes.
 */
export interface EmailMessage {
  from: string;
  to: string;
  headers: Record<string, string>;
  raw: string;
}

/**
 * Generic blob parameter type for binary data.
 */
export interface BlobParameter {
  data: Uint8Array;
  mimeType: string;
  filename?: string;
}

/**
 * Minimal integration information exposed to nodes.
 * Token is automatically refreshed if expired when accessed via getIntegration.
 */
export interface IntegrationInfo {
  id: string;
  name: string;
  provider: string;
  token: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context passed to each node during execution.
 * Provides access to inputs, secrets, integrations, and platform services.
 */
export interface NodeContext {
  nodeId: string;
  workflowId: string;
  organizationId: string;
  mode: WorkflowMode;
  deploymentId?: string;
  inputs: Record<string, unknown>;
  onProgress?: (progress: number) => void;
  httpRequest?: HttpRequest;
  emailMessage?: EmailMessage;
  queueMessage?: QueueMessage;
  scheduledTrigger?: ScheduledTrigger;
  toolRegistry?: ToolRegistry;
  objectStore?: ObjectStore;
  getSecret?: (secretName: string) => Promise<string | undefined>;
  getIntegration: (integrationId: string) => Promise<IntegrationInfo>;
}

// =============================================================================
// NODE REGISTRY
// =============================================================================

/**
 * Interface for executable node instances.
 * This is what the runtime calls to execute a node.
 */
export interface ExecutableNode {
  readonly node: Node;
  execute(context: NodeContext): Promise<NodeExecution>;
}

/**
 * Interface for node type resolution and instantiation.
 * Runtime uses this to look up node types and create executable instances.
 */
export interface NodeRegistry {
  /** Get metadata for a node type */
  getNodeType(nodeType: string): NodeType;

  /** Create an executable instance from a node definition */
  createExecutableNode(node: Node): ExecutableNode | undefined;
}

/**
 * Interface for tool registry (function calling support).
 * Provides tool definitions for LLM nodes.
 */
export interface ToolRegistry {
  getToolDefinitions(references: ToolReference[]): Promise<ToolDefinition[]>;
}

/**
 * Reference to a tool for function calling.
 */
export interface ToolReference {
  type: string;
  identifier: string;
}

/**
 * Tool definition for LLM function calling.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// =============================================================================
// PARAMETER MAPPER
// =============================================================================

/**
 * Interface for transforming values between API format and node format.
 * Handles blob storage/retrieval during transformation.
 */
export interface ParameterMapper {
  /**
   * Transform node output to API format.
   * May write blobs to ObjectStore and return references.
   */
  nodeToApi(
    type: string,
    value: unknown,
    organizationId: string,
    executionId?: string
  ): Promise<ApiParameterValue>;

  /**
   * Transform API input to node format.
   * May read blobs from ObjectStore and return data.
   */
  apiToNode(type: string, value: ApiParameterValue): Promise<unknown>;
}

// =============================================================================
// WORKFLOW VALIDATOR
// =============================================================================

/**
 * Validation error from workflow validation.
 */
export interface ValidationError {
  type: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Interface for workflow validation before execution.
 */
export interface WorkflowValidator {
  /** Validate a workflow and return any errors */
  validate(workflow: Workflow): ValidationError[];
}

// =============================================================================
// RESOURCE PROVIDER
// =============================================================================

/**
 * Interface for providing organization resources to workflow nodes.
 * Handles initialization, context creation for nodes.
 */
export interface ResourceProvider {
  /**
   * Preloads all organization secrets and integrations for synchronous access.
   */
  initialize(organizationId: string): Promise<void>;

  /**
   * Creates a NodeContext for node execution with access to secrets and integrations.
   */
  createNodeContext(
    nodeId: string,
    workflowId: string,
    organizationId: string,
    inputs: Record<string, unknown>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger,
    deploymentId?: string
  ): NodeContext;
}

// =============================================================================
// CREDIT SERVICE
// =============================================================================

/**
 * Parameters for credit availability check.
 */
export interface CreditCheckParams {
  organizationId: string;
  /** Included credits for the organization's plan */
  computeCredits: number;
  /** Estimated usage for the workflow */
  estimatedUsage: number;
  /** Subscription status (e.g., "active" for Pro users) */
  subscriptionStatus?: string;
  /** Maximum overage allowed beyond included credits. null = unlimited */
  overageLimit?: number | null;
}

/**
 * Interface for credit management operations.
 * Implementations handle compute credit checks and usage tracking.
 */
export interface CreditService {
  /**
   * Check if organization has enough credits for workflow execution.
   */
  hasEnoughCredits(params: CreditCheckParams): Promise<boolean>;

  /**
   * Record compute usage for an organization.
   */
  recordUsage(organizationId: string, usage: number): Promise<void>;
}
