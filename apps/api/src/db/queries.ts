import {
  Deployment,
  NodeExecution,
  Workflow as WorkflowType,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import * as crypto from "crypto";
import { and, desc, eq, inArray, lte, SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";

import { Bindings } from "../context";
import { ObjectStore } from "../runtime/object-store";
import { encryptSecret } from "../utils/encryption";
import {
  type ApiKeyInsert,
  apiKeys,
  createDatabase,
  type CronTriggerInsert,
  type CronTriggerRow,
  cronTriggers,
  type DatasetInsert,
  type DatasetRow,
  datasets,
  type DeploymentInsert,
  type DeploymentRow,
  deployments,
  type ExecutionRow,
  executions,
  type ExecutionStatusType,
  type MembershipInsert,
  type MembershipRow,
  memberships,
  type OrganizationInsert,
  OrganizationRole,
  type OrganizationRoleType,
  organizations,
  Plan,
  type PlanType,
  type SecretInsert,
  secrets,
  UserRole,
  type UserRoleType,
  type UserRow,
  users,
  type WorkflowInsert,
  type WorkflowRow,
  workflows,
} from "./index";

/**
 * Generate a URL-friendly handle from a name with a random suffix
 *
 * @param name The name to convert into a handle
 * @param withRandomSuffix Whether to add a random suffix (default: true)
 * @returns A URL-friendly handle with a random suffix
 */
export function createHandle(
  name: string,
  withRandomSuffix: boolean = true
): string {
  // Convert to lowercase and replace spaces with hyphens
  const baseHandle = name.toLowerCase().replace(/\s+/g, "-");

  // Replace any non-alphanumeric characters (except hyphens) with empty string
  const cleanedHandle = baseHandle.replace(/[^a-z0-9-]/g, "");

  // Add a random suffix if requested
  if (withRandomSuffix) {
    // Generate a random 6-character alphanumeric suffix
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${cleanedHandle}-${randomSuffix}`;
  }

  return cleanedHandle;
}

/**
 * Data required to save an execution record
 */
export type SaveExecutionRecord = {
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
};

/**
 * Data required to save a user record
 */
export type UserData = {
  provider: "github" | "google";
  providerId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  plan?: string;
  role?: string;
};

/**
 * Save a user to the database and ensure they belong to an organization.
 * This function handles user creation and linking accounts via email.
 *
 * @param db Database instance
 * @param userData User data from the authentication provider
 * @returns Object containing the user and their main organization
 */
export async function saveUser(
  db: ReturnType<typeof createDatabase>,
  userData: UserData
): Promise<{ user: UserRow; organization: OrganizationInsert }> {
  const now = new Date();
  const { provider, providerId, email, name, avatarUrl } = userData;

  // 1. Check if user exists with this provider ID
  const providerColumn =
    provider === "github" ? users.githubId : users.googleId;
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(providerColumn, providerId));

  if (existingUser) {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, existingUser.organizationId));
    return { user: existingUser, organization };
  }

  // 2. If email is provided, check if a user exists with this email
  if (email) {
    const [userByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (userByEmail) {
      // Link the new provider to the existing account
      const [updatedUser] = await db
        .update(users)
        .set({ [provider === "github" ? "githubId" : "googleId"]: providerId })
        .where(eq(users.id, userByEmail.id))
        .returning();

      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, updatedUser.organizationId));

      return { user: updatedUser, organization };
    }
  }

  // 3. User doesn't exist, create a new user and organization
  const userId = uuidv7();
  const organizationId = uuidv7();
  const handle = createHandle(name);

  const organization: OrganizationInsert = {
    id: organizationId,
    name: `Personal`,
    handle,
    createdAt: now,
    updatedAt: now,
  };

  const newUser = {
    id: userId,
    name: name,
    email: email,
    githubId: provider === "github" ? providerId : undefined,
    googleId: provider === "google" ? providerId : undefined,
    avatarUrl: avatarUrl,
    organizationId: organizationId,
    plan: (userData.plan as PlanType) || Plan.TRIAL,
    role: (userData.role as UserRoleType) || UserRole.USER,
    createdAt: now,
    updatedAt: now,
  };

  const newMembership: MembershipInsert = {
    userId: userId,
    organizationId: organizationId,
    role: OrganizationRole.OWNER,
    createdAt: now,
    updatedAt: now,
  };

  const [organizationResult, userResult] = await db.batch([
    db.insert(organizations).values(organization).returning(),
    db.insert(users).values(newUser).returning(),
    db.insert(memberships).values(newMembership),
  ]);

  const [user] = userResult;
  const [organizationRecord] = organizationResult;

  return { user, organization: organizationRecord };
}

/**
 * Check if a string is a valid UUID
 *
 * @param value The string to check
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function getOrganizationCondition(organizationIdOrHandle: string) {
  if (isUUID(organizationIdOrHandle)) {
    return eq(organizations.id, organizationIdOrHandle);
  } else {
    return eq(organizations.handle, organizationIdOrHandle);
  }
}

export function getWorkflowCondition(workflowIdOrHandle: string) {
  if (isUUID(workflowIdOrHandle)) {
    return eq(workflows.id, workflowIdOrHandle);
  } else {
    return eq(workflows.handle, workflowIdOrHandle);
  }
}

export function getDatasetCondition(datasetIdOrHandle: string) {
  if (isUUID(datasetIdOrHandle)) {
    return eq(datasets.id, datasetIdOrHandle);
  } else {
    return eq(datasets.handle, datasetIdOrHandle);
  }
}

/**
 * Get all workflows for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID
 * @returns Array of workflows with basic info
 */
export async function getWorkflows(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return await db
    .select({
      id: workflows.id,
      name: workflows.name,
      handle: workflows.handle,
      type: workflows.type,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    })
    .from(workflows)
    .innerJoin(
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get a workflow by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param workflowIdOrHandle Workflow ID or handle
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Workflow record or undefined if not found
 */
export async function getWorkflow(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<WorkflowRow | undefined> {
  const [workflow] = await db
    .select()
    .from(workflows)
    .innerJoin(
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle),
        getWorkflowCondition(workflowIdOrHandle)
      )
    )
    .limit(1);
  return workflow?.workflows;
}

/**
 * Get a workflow that the user has access to through their organization memberships
 *
 * @param db Database instance
 * @param workflowIdOrHandle Workflow ID or handle
 * @param userId User ID to check access for
 * @returns The workflow and organization ID if user has access, undefined otherwise
 */
export async function getWorkflowWithUserAccess(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  userId: string
): Promise<{ workflow: WorkflowRow; organizationId: string } | undefined> {
  const [result] = await db
    .select({
      workflow: workflows,
      organizationId: workflows.organizationId,
    })
    .from(workflows)
    .innerJoin(
      memberships,
      eq(workflows.organizationId, memberships.organizationId)
    )
    .where(
      and(
        eq(memberships.userId, userId),
        getWorkflowCondition(workflowIdOrHandle)
      )
    )
    .limit(1);

  return result
    ? { workflow: result.workflow, organizationId: result.organizationId }
    : undefined;
}

/**
 * Get the latest deployment for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns The latest deployment or undefined if none found
 */
export async function getLatestDeployment(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<DeploymentRow | undefined> {
  const [firstResult] = await db
    .select()
    .from(deployments)
    .innerJoin(
      workflows,
      and(
        eq(deployments.workflowId, workflows.id),
        getWorkflowCondition(workflowIdOrHandle)
      )
    )
    .innerJoin(
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  return firstResult?.deployments;
}

export async function getDeploymentByVersion(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  organizationIdOrHandle: string,
  version: string
): Promise<DeploymentRow | undefined> {
  const [firstResult] = await db
    .select({ deployments: deployments })
    .from(deployments)
    .innerJoin(workflows, eq(deployments.workflowId, workflows.id))
    .innerJoin(organizations, eq(workflows.organizationId, organizations.id))
    .where(
      and(
        eq(deployments.version, parseInt(version, 10)),
        getWorkflowCondition(workflowIdOrHandle),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .limit(1);

  return firstResult?.deployments;
}

/**
 * Create a new workflow
 *
 * @param db Database instance
 * @param newWorkflow Workflow data to insert
 * @returns Created workflow record
 */
export async function createWorkflow(
  db: ReturnType<typeof createDatabase>,
  newWorkflow: WorkflowInsert
): Promise<WorkflowRow> {
  const [workflow] = await db.insert(workflows).values(newWorkflow).returning();

  return workflow;
}

/**
 * Update a workflow (metadata only), ensuring it belongs to the specified organization
 * Note: Full workflow data should be saved to R2 separately by the caller
 *
 * @param db Database instance
 * @param id Workflow ID
 * @param organizationId Organization ID
 * @param data Updated workflow metadata (name, type, timestamps, etc.)
 * @returns Updated workflow record
 */
export async function updateWorkflow(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<WorkflowRow>
): Promise<WorkflowRow> {
  const [workflow] = await db
    .update(workflows)
    .set(data)
    .where(
      and(eq(workflows.id, id), eq(workflows.organizationId, organizationId))
    )
    .returning();

  return workflow;
}

/**
 * Delete a workflow, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Workflow ID
 * @param organizationId Organization ID
 * @returns Deleted workflow record
 */
export async function deleteWorkflow(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<WorkflowRow | undefined> {
  const [workflow] = await db
    .delete(workflows)
    .where(
      and(eq(workflows.id, id), eq(workflows.organizationId, organizationId))
    )
    .returning();

  return workflow;
}

/**
 * Execution Operations
 */

/**
 * Get an execution by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Execution ID
 * @param organizationId Organization ID
 * @returns Execution record or undefined if not found
 */
export async function getExecution(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationIdOrHandle: string
): Promise<ExecutionRow | undefined> {
  const [execution] = await db
    .select()
    .from(executions)
    .innerJoin(
      organizations,
      and(
        eq(executions.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(eq(executions.id, id))
    .limit(1);
  return execution?.executions;
}

/**
 * Save an execution record (metadata only)
 * Note: Full execution data should be saved to R2 separately by the caller
 *
 * @param db Database instance
 * @param record Execution data to save
 * @returns Workflow execution object
 */
export async function saveExecution(
  db: ReturnType<typeof createDatabase>,
  record: SaveExecutionRecord
): Promise<WorkflowExecution> {
  const now = new Date();
  const { nodeExecutions, userId, deploymentId, ...dbFields } = record;

  // Create the execution object that will be returned (and saved to R2 by caller)
  const executionData: WorkflowExecution = {
    id: record.id,
    workflowId: record.workflowId,
    deploymentId: record.deploymentId,
    status: record.status as WorkflowExecutionStatus,
    nodeExecutions,
    error: record.error,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };

  // Create the metadata record to insert into the database (no data field)
  const dbRecord = {
    ...dbFields,
    deploymentId: deploymentId,
    updatedAt: record.updatedAt ?? now,
    createdAt: record.createdAt ?? now,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };

  await db
    .insert(executions)
    .values(dbRecord)
    .onConflictDoUpdate({ target: executions.id, set: dbRecord });

  return executionData;
}

/**
 * Create a new API key for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param name Descriptive name for the key
 * @returns Object containing the raw key (shown only once) and the key record
 */
export async function createApiKey(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  name: string
) {
  const id = uuidv7();
  const now = new Date();

  // Generate a secure random key with prefix
  const rawKeyBytes = crypto.randomBytes(32).toString("hex");
  const rawApiKey = `dk_${rawKeyBytes}`;

  // Hash the key for storage
  const hashedApiKey = crypto
    .createHash("sha256")
    .update(rawApiKey)
    .digest("hex");

  // Create the key record
  const newApiKey: ApiKeyInsert = {
    id,
    name,
    key: hashedApiKey,
    organizationId,
    createdAt: now,
    updatedAt: now,
  };

  // Insert the key record
  const [apiKeyRecord] = await db.insert(apiKeys).values(newApiKey).returning();

  // Return both the raw key (only shown once) and the record
  return {
    rawApiKey: rawApiKey, // The plain key value without any prefix
    apiKey: apiKeyRecord,
  };
}

/**
 * Verify an API key against an organization
 *
 * @param db Database instance
 * @param providedApiKey The API key to verify
 * @param organizationIdOrHandle The ID or handle of the organization to verify against
 * @returns The organization ID if the key is valid for the organization, null otherwise
 */
export async function verifyApiKey(
  db: ReturnType<typeof createDatabase>,
  providedApiKey: string,
  organizationIdOrHandle: string
): Promise<string | null> {
  if (!providedApiKey) {
    return null;
  }

  // Hash the provided API key
  const hashedApiKey = crypto
    .createHash("sha256")
    .update(providedApiKey)
    .digest("hex");

  // Query the database for the API key
  const [apiKeyRecord] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, hashedApiKey));

  if (!apiKeyRecord || !apiKeyRecord.organizationId) {
    return null; // Key not found or not associated with an organization
  }

  // Check if the API key belongs to the specified organization
  const organizationCondition = getOrganizationCondition(
    organizationIdOrHandle
  );
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(organizationCondition);

  if (!organization || organization.id !== apiKeyRecord.organizationId) {
    return null; // API key does not belong to the specified organization
  }

  // API key is valid and belongs to the specified organization
  return apiKeyRecord.organizationId;
}

/**
 * List API keys for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of API key records (without the key hash)
 */
export async function getApiKeys(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .innerJoin(
      organizations,
      and(
        eq(apiKeys.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Delete an API key
 *
 * @param db Database instance
 * @param id Key ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns True if key was deleted, false if not found
 */
export async function deleteApiKey(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<boolean> {
  // Try to delete the key by its ID and organization
  const [deletedApiKey] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .returning({ id: apiKeys.id });

  // If we got a record back, it was deleted successfully
  return !!deletedApiKey;
}

/**
 * Get a deployment by its ID
 *
 * @param db Database instance
 * @param id Deployment ID
 * @param organizationId Organization ID for security checks
 * @returns The deployment or undefined if not found
 */
export async function getDeployment(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationIdOrHandle: string
): Promise<DeploymentRow | undefined> {
  const [resultRow] = await db
    .select({ deployments: deployments })
    .from(deployments)
    .innerJoin(organizations, eq(deployments.organizationId, organizations.id))
    .where(
      and(
        eq(deployments.id, id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
  return resultRow?.deployments;
}

/**
 * Create a new deployment
 *
 * @param db Database instance
 * @param newDeployment Deployment data
 * @returns The created deployment
 */
export async function createDeployment(
  db: ReturnType<typeof createDatabase>,
  newDeployment: DeploymentInsert
): Promise<DeploymentRow> {
  await db.insert(deployments).values(newDeployment);

  const [deployment] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, newDeployment.id));

  return deployment;
}

/**
 * Get deployments grouped by workflow
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of WorkflowDeployment objects
 */
export async function getDeploymentsGroupedByWorkflow(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
): Promise<Deployment[]> {
  const workflowDeploymentAggregates = db
    .$with("workflow_deployment_aggregates")
    .as(
      db
        .select({
          workflowId: deployments.workflowId,
          maxVersion: sql<number>`MAX(${deployments.version})`
            .mapWith(Number)
            .as("max_version"),
          deploymentCount: sql<number>`COUNT(${deployments.id})`
            .mapWith(Number)
            .as("deployment_count"),
        })
        .from(deployments)
        .innerJoin(
          organizations,
          and(
            eq(deployments.organizationId, organizations.id),
            getOrganizationCondition(organizationIdOrHandle)
          )
        )
        .groupBy(deployments.workflowId)
    );

  // Alias the deployments table to clearly refer to the specific deployment record
  // that corresponds to the maxVersion. This is not strictly necessary if Drizzle handles
  // self-joins well without it, but can improve clarity.
  // Using a different alias name if 'latest_deployment' was used before or is confusing.
  const actualLatestDeployment = alias(deployments, "actual_latest_deployment");

  const results = await db
    .with(workflowDeploymentAggregates)
    .select({
      workflowId: workflows.id,
      workflowName: workflows.name,
      workflowType: workflows.type,
      latestDeploymentId: actualLatestDeployment.id,
      latestVersion: workflowDeploymentAggregates.maxVersion,
      deploymentCount: workflowDeploymentAggregates.deploymentCount,
      latestCreatedAt: actualLatestDeployment.createdAt,
    })
    .from(workflows)
    .innerJoin(
      workflowDeploymentAggregates,
      eq(workflows.id, workflowDeploymentAggregates.workflowId)
    )
    .innerJoin(
      actualLatestDeployment,
      and(
        eq(
          actualLatestDeployment.workflowId,
          workflowDeploymentAggregates.workflowId
        ),
        eq(
          actualLatestDeployment.version,
          workflowDeploymentAggregates.maxVersion
        )
      )
    )
    .innerJoin(
      // Ensure workflows themselves are filtered by the organization
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .orderBy(desc(actualLatestDeployment.createdAt)); // Order by the actual latest deployment's creation time

  return results.map((row) => ({
    workflowId: row.workflowId,
    workflowName: row.workflowName,
    workflowType: row.workflowType,
    latestDeploymentId: row.latestDeploymentId,
    latestVersion: row.latestVersion,
    deploymentCount: row.deploymentCount,
    latestCreatedAt: row.latestCreatedAt,
  }));
}

/**
 * Get deployments for a workflow, sorted by creation date
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Array of deployment records
 */
export async function getDeployments(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationIdOrHandle: string
): Promise<DeploymentRow[]> {
  const results = await db
    .select({ deployments: deployments })
    .from(deployments)
    .innerJoin(organizations, eq(deployments.organizationId, organizations.id))
    .where(
      and(
        eq(deployments.workflowId, workflowId),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .orderBy(desc(deployments.createdAt));

  return results.map((item) => item.deployments);
}

/**
 * Get the latest version number for a workflow's deployments
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns The latest version number or null if no deployments exist
 */
export async function getLatestDeploymentsVersionNumbers(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationIdOrHandle: string
): Promise<number | null> {
  const [resultRow] = await db
    .select({
      maxVersion: sql<number>`MAX(${deployments.version})`.mapWith(Number),
    })
    .from(deployments)
    .innerJoin(organizations, eq(deployments.organizationId, organizations.id))
    .where(
      and(
        eq(deployments.workflowId, workflowId),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );

  return resultRow?.maxVersion ?? null;
}

/**
 * List executions with optional filtering and pagination
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param options Optional filters: workflowId, deploymentId, limit, offset
 * @returns Array of execution records
 */
export async function listExecutions(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string,
  options?: {
    workflowId?: string;
    deploymentId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ExecutionRow[]> {
  // Base query structure using an explicit join
  // Explicitly select all columns from the executions table
  let query = db
    .select({ executions: executions })
    .from(executions)
    .innerJoin(organizations, eq(executions.organizationId, organizations.id))
    .$dynamic(); // Use $dynamic() to allow for conditional query building

  // Array to hold all conditions for the WHERE clause
  const conditions = [];

  // Add condition for organization (ID or Handle)
  conditions.push(getOrganizationCondition(organizationIdOrHandle));

  // Add optional condition for workflowId on the 'executions' table
  if (options?.workflowId) {
    conditions.push(eq(executions.workflowId, options.workflowId));
  }

  // Add optional condition for deploymentId on the 'executions' table
  if (options?.deploymentId) {
    conditions.push(eq(executions.deploymentId, options.deploymentId));
  }

  // Filter out any undefined conditions that might arise if optional fields are not provided
  const validConditions = conditions.filter((c) => c !== undefined) as SQL[];
  if (validConditions.length > 0) {
    query = query.where(and(...validConditions));
  }

  // Apply ORDER BY to sort executions by creation date (descending)
  query = query.orderBy(desc(executions.createdAt));

  // Apply LIMIT if provided for pagination
  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }

  // Apply OFFSET if provided for pagination
  if (options?.offset !== undefined) {
    query = query.offset(options.offset);
  }

  // Execute the query
  const results = await query;

  // Map results to return only ExecutionRow objects.
  // Since we selected { executions: executions }, each item in 'results' will have an 'executions' property.
  return results.map((item) => item.executions);
}

/**
 * Get workflow names by their IDs
 *
 * @param db Database instance
 * @param workflowIds Array of workflow IDs
 * @returns Array of workflow IDs and names
 */
export async function getWorkflowNames(
  db: ReturnType<typeof createDatabase>,
  workflowIds: string[]
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: workflows.id, name: workflows.name })
    .from(workflows)
    .where(inArray(workflows.id, workflowIds));
}

/**
 * Get a single workflow name by ID
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @returns Workflow name or undefined if not found
 */
export async function getWorkflowName(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<string | undefined> {
  const [workflow] = await db
    .select({ name: workflows.name })
    .from(workflows)
    .innerJoin(
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(getWorkflowCondition(workflowIdOrHandle));

  return workflow?.name;
}

/**
 * Get a cron trigger.
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Cron trigger record or undefined.
 */
export async function getCronTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationIdOrHandle: string
): Promise<CronTriggerRow | undefined> {
  const [cronTrigger] = await db
    .select()
    .from(cronTriggers)
    .innerJoin(workflows, eq(cronTriggers.workflowId, workflows.id))
    .innerJoin(
      organizations,
      and(
        eq(workflows.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(eq(cronTriggers.workflowId, workflowId))
    .limit(1);

  return cronTrigger?.cron_triggers;
}

/**
 * Create or update a cron trigger.
 *
 * @param db Database instance
 * @param values Cron trigger data.
 * @returns The created or updated cron trigger record.
 */
export async function upsertCronTrigger(
  db: ReturnType<typeof createDatabase>,
  values: CronTriggerInsert
): Promise<CronTriggerRow> {
  const now = new Date();
  const updateSet = {
    ...values,
    updatedAt: now,
  };
  const [upsertedCron] = await db
    .insert(cronTriggers)
    .values({
      ...values,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cronTriggers.workflowId,
      set: updateSet,
    })
    .returning();

  return upsertedCron;
}

/**
 * Update run times for a cron trigger.
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param nextRunAt New next run time
 * @param lastRun Current execution time
 * @returns Updated cron trigger record or undefined.
 */
export async function updateCronTriggerRunTimes(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  nextRunAt: Date,
  lastRun: Date
): Promise<CronTriggerRow | undefined> {
  const now = new Date();
  const [updatedTrigger] = await db
    .update(cronTriggers)
    .set({
      lastRun: lastRun,
      nextRunAt: nextRunAt,
      updatedAt: now,
    })
    .where(eq(cronTriggers.workflowId, workflowId))
    .returning();
  return updatedTrigger;
}

/**
 * Get active, due cron triggers together with the workflow and (optionally) a
 * deployment that should be executed.
 */
export async function getDueCronTriggers(
  db: ReturnType<typeof createDatabase>,
  now: Date
): Promise<
  {
    cronTrigger: CronTriggerRow;
    workflow: WorkflowRow;
    deployment: DeploymentRow | null;
  }[]
> {
  const latestByWorkflow = db
    .select({
      workflowId: deployments.workflowId,
      latestVersion: sql<number>`MAX(${deployments.version})`.as(
        "latest_version"
      ),
    })
    .from(deployments)
    .groupBy(deployments.workflowId)
    .as("latest_by_workflow");

  const latestDeployment = alias(deployments, "latest_deployment");
  const selectedDeployment = alias(deployments, "selected_deployment");

  const rows = await db
    .select({
      cronTrigger: cronTriggers,
      workflow: workflows,
      latestDeployment: latestDeployment,
      selectedDeployment: selectedDeployment,
    })
    .from(cronTriggers)
    .where(and(eq(cronTriggers.active, true), lte(cronTriggers.nextRunAt, now)))
    .innerJoin(workflows, eq(workflows.id, cronTriggers.workflowId))
    .leftJoin(latestByWorkflow, eq(latestByWorkflow.workflowId, workflows.id))
    .leftJoin(
      latestDeployment,
      and(
        eq(latestDeployment.workflowId, latestByWorkflow.workflowId),
        eq(latestDeployment.version, latestByWorkflow.latestVersion)
      )
    )
    .leftJoin(
      selectedDeployment,
      and(
        eq(selectedDeployment.workflowId, workflows.id),
        eq(selectedDeployment.version, cronTriggers.versionNumber)
      )
    )
    .all();

  return rows
    .filter(
      (r) =>
        r.cronTrigger.versionAlias === "dev" ||
        (r.cronTrigger.versionAlias === "latest" && r.latestDeployment) ||
        (r.cronTrigger.versionAlias === "version" && r.selectedDeployment)
    )
    .map((r) => ({
      cronTrigger: r.cronTrigger,
      workflow: r.workflow,
      deployment:
        r.cronTrigger.versionAlias === "latest"
          ? r.latestDeployment
          : r.cronTrigger.versionAlias === "version"
            ? r.selectedDeployment
            : null,
    }));
}

/**
 * Get all datasets for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of datasets with basic info
 */
export async function getDatasets(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return await db
    .select({
      id: datasets.id,
      name: datasets.name,
      handle: datasets.handle,
      createdAt: datasets.createdAt,
      updatedAt: datasets.updatedAt,
    })
    .from(datasets)
    .innerJoin(
      organizations,
      and(
        eq(datasets.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get a dataset by ID or handle, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param datasetIdOrHandle Dataset ID or handle
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Dataset record or undefined if not found
 */
export async function getDataset(
  db: ReturnType<typeof createDatabase>,
  datasetIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<DatasetRow | undefined> {
  const [dataset] = await db
    .select()
    .from(datasets)
    .innerJoin(
      organizations,
      and(
        eq(datasets.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(getDatasetCondition(datasetIdOrHandle))
    .limit(1);
  return dataset?.datasets;
}

/**
 * Create a new dataset
 *
 * @param db Database instance
 * @param newDataset Dataset data to insert
 * @returns Created dataset record
 */
export async function createDataset(
  db: ReturnType<typeof createDatabase>,
  newDataset: DatasetInsert
): Promise<DatasetRow> {
  const [dataset] = await db.insert(datasets).values(newDataset).returning();

  return dataset;
}

/**
 * Update a dataset, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Dataset ID
 * @param organizationId Organization ID
 * @param data Updated dataset data
 * @returns Updated dataset record
 */
export async function updateDataset(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<DatasetRow>
): Promise<DatasetRow> {
  const [dataset] = await db
    .update(datasets)
    .set(data)
    .where(
      and(eq(datasets.id, id), eq(datasets.organizationId, organizationId))
    )
    .returning();

  return dataset;
}

/**
 * Delete a dataset, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Dataset ID
 * @param organizationId Organization ID
 * @returns Deleted dataset record
 */
export async function deleteDataset(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<DatasetRow | undefined> {
  const [dataset] = await db
    .delete(datasets)
    .where(
      and(eq(datasets.id, id), eq(datasets.organizationId, organizationId))
    )
    .returning();

  return dataset;
}

/**
 * Get an organization's compute credits
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Organization's compute credits or undefined if not found
 */
export async function getOrganizationComputeCredits(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
): Promise<number | undefined> {
  const [organization] = await db
    .select({ computeCredits: organizations.computeCredits })
    .from(organizations)
    .where(getOrganizationCondition(organizationIdOrHandle))
    .limit(1);
  return organization?.computeCredits;
}

/**
 * Create a new secret for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param name Descriptive name for the secret
 * @param value The secret value to encrypt
 * @param env Environment variables (for encryption key)
 * @returns Object containing the secret record and the unencrypted value
 */
export async function createSecret(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  name: string,
  value: string,
  env: Bindings
) {
  const id = uuidv7();
  const now = new Date();

  // Encrypt the secret value using organization-specific key
  const encryptedValue = await encryptSecret(value, env, organizationId);

  // Create the secret record
  const newSecret: SecretInsert = {
    id,
    name,
    encryptedValue,
    organizationId,
    createdAt: now,
    updatedAt: now,
  };

  // Insert the secret record
  const [secretRecord] = await db.insert(secrets).values(newSecret).returning();

  // Return both the unencrypted value (only shown once) and the record
  return {
    value: value, // The plain secret value
    secret: secretRecord,
  };
}

/**
 * List secrets for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of secret records (without the encrypted value)
 */
export async function getSecrets(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return db
    .select({
      id: secrets.id,
      name: secrets.name,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .innerJoin(
      organizations,
      and(
        eq(secrets.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get all encrypted secrets for an organization (including encrypted values)
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of secret records with encrypted values
 */
export async function getAllSecretsWithValues(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return db
    .select({
      id: secrets.id,
      name: secrets.name,
      encryptedValue: secrets.encryptedValue,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .innerJoin(
      organizations,
      and(
        eq(secrets.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get a secret by ID (without the encrypted value)
 *
 * @param db Database instance
 * @param id Secret ID
 * @param organizationId Organization ID
 * @returns Secret record or null if not found
 */
export async function getSecret(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
) {
  const [secret] = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .where(and(eq(secrets.id, id), eq(secrets.organizationId, organizationId)))
    .limit(1);

  return secret || null;
}

/**
 * Update a secret
 *
 * @param db Database instance
 * @param id Secret ID
 * @param organizationId Organization ID
 * @param updates Fields to update
 * @param env Environment variables (for encryption key)
 * @returns Updated secret record or null if not found
 */
export async function updateSecret(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  updates: { name?: string; value?: string },
  env: Bindings
) {
  const now = new Date();
  const updateData: Partial<SecretInsert> = {
    updatedAt: now,
  };

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.value) {
    // Encrypt the new secret value using organization-specific key
    updateData.encryptedValue = await encryptSecret(
      updates.value,
      env,
      organizationId
    );
  }

  const [updatedSecret] = await db
    .update(secrets)
    .set(updateData)
    .where(and(eq(secrets.id, id), eq(secrets.organizationId, organizationId)))
    .returning({
      id: secrets.id,
      name: secrets.name,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    });

  return updatedSecret || null;
}

/**
 * Delete a secret
 *
 * @param db Database instance
 * @param id Secret ID
 * @param organizationId Organization ID
 * @returns True if secret was deleted, false if not found
 */
export async function deleteSecret(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<boolean> {
  // Try to delete the secret by its ID and organization
  const [deletedSecret] = await db
    .delete(secrets)
    .where(and(eq(secrets.id, id), eq(secrets.organizationId, organizationId)))
    .returning({ id: secrets.id });

  // If we got a record back, it was deleted successfully
  return !!deletedSecret;
}

/**
 * List all organizations for a user
 *
 * @param db Database instance
 * @param userId User ID
 * @returns Array of organizations
 */
export async function getUserOrganizations(
  db: ReturnType<typeof createDatabase>,
  userId: string
) {
  return await db
    .select({
      id: organizations.id,
      name: organizations.name,
      handle: organizations.handle,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.createdAt);
}

/**
 * Create a new organization and make the creator the owner
 *
 * @param db Database instance
 * @param name Organization name
 * @param handle Organization handle (optional, will be generated from name if not provided)
 * @param creatorUserId User ID of the creator who will become the owner
 * @returns Object containing the created organization and membership
 */
export async function createOrganization(
  db: ReturnType<typeof createDatabase>,
  name: string,
  creatorUserId: string,
  handle?: string
): Promise<{
  organization: OrganizationInsert;
  membership: MembershipInsert;
}> {
  const now = new Date();
  const organizationId = uuidv7();

  // Generate handle from name if not provided
  const organizationHandle = handle || createHandle(name);

  const organization: OrganizationInsert = {
    id: organizationId,
    name,
    handle: organizationHandle,
    computeCredits: 1000, // Default compute credits
    createdAt: now,
    updatedAt: now,
  };

  const membership: MembershipInsert = {
    userId: creatorUserId,
    organizationId: organizationId,
    role: OrganizationRole.OWNER,
    createdAt: now,
    updatedAt: now,
  };

  // Use batch to ensure atomicity
  await db.batch([
    db.insert(organizations).values(organization),
    db.insert(memberships).values(membership),
  ]);

  return { organization, membership };
}

/**
 * Delete an organization (only owners can delete)
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @param userId User ID attempting to delete
 * @returns True if organization was deleted, false if not found or user is not owner
 */
export async function deleteOrganization(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string,
  userId: string
): Promise<boolean> {
  // First, verify the user is the owner of the organization
  const [membership] = await db
    .select()
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, userId),
        getOrganizationCondition(organizationIdOrHandle),
        eq(memberships.role, OrganizationRole.OWNER)
      )
    )
    .limit(1);

  if (!membership) {
    return false; // User is not the owner or organization doesn't exist
  }

  const organizationId = membership.organizations.id;

  // Delete the organization (cascade will handle related records)
  const [deletedOrganization] = await db
    .delete(organizations)
    .where(eq(organizations.id, organizationId))
    .returning({ id: organizations.id });

  return !!deletedOrganization;
}

/**
 * Check if a user is the owner of an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param userId User ID to check
 * @returns True if user is the organization owner, false otherwise
 */
export async function isOrganizationOwner(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId),
        eq(memberships.role, OrganizationRole.OWNER)
      )
    )
    .limit(1);

  return !!membership;
}

/**
 * Add or update a user's membership in an organization
 *
 * Role-based permissions:
 * - Only owners and admins can add/update memberships
 * - Only owners can assign admin roles
 * - Only owners can assign owner roles (but owner role cannot be changed)
 * - Members cannot add/update memberships
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @param targetUserEmail Email of the user to add/update membership for
 * @param role Role to assign (member, admin, owner)
 * @param adminUserId User ID of the admin/owner making the change
 * @returns The created or updated membership record, or null if permission denied or user not found
 */
export async function addOrUpdateMembership(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string,
  targetUserEmail: string,
  role: OrganizationRoleType,
  adminUserId: string
): Promise<MembershipRow | null> {
  // Get the organization ID first
  const [organization] = await db
    .select()
    .from(organizations)
    .where(getOrganizationCondition(organizationIdOrHandle))
    .limit(1);

  if (!organization) {
    return null; // Organization not found
  }

  const organizationId = organization.id;

  // Check if the admin user is the organization owner
  const isAdminOwner = await isOrganizationOwner(
    db,
    organizationId,
    adminUserId
  );

  // If not the owner, check if they have admin role
  let hasAdminRole = false;
  if (!isAdminOwner) {
    const [adminMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, adminUserId),
          eq(memberships.organizationId, organizationId),
          eq(memberships.role, OrganizationRole.ADMIN)
        )
      )
      .limit(1);
    hasAdminRole = !!adminMembership;
  }

  // Permission check: Only owners and admins can add/update memberships
  if (!isAdminOwner && !hasAdminRole) {
    return null; // User doesn't have permission
  }

  // Role assignment restrictions
  if (role === OrganizationRole.OWNER) {
    return null; // Owner role cannot be assigned - there's only one owner (the creator)
  }

  if (role === OrganizationRole.ADMIN && !isAdminOwner) {
    return null; // Only owners can assign admin roles
  }

  // Look up the target user by email
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetUserEmail))
    .limit(1);

  if (!targetUser) {
    return null; // User not found with this email
  }

  const targetUserId = targetUser.id;

  // Prevent adding the organization owner as a member (they're already the owner)
  const isTargetUserOwner = await isOrganizationOwner(
    db,
    organizationId,
    targetUserId
  );
  if (isTargetUserOwner) {
    return null; // Cannot add/change role of the organization owner
  }

  const now = new Date();

  // Check if the target user is already a member
  const [existingMembership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, targetUserId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (existingMembership) {
    // Update existing membership
    const [updatedMembership] = await db
      .update(memberships)
      .set({
        role,
        updatedAt: now,
      })
      .where(
        and(
          eq(memberships.userId, targetUserId),
          eq(memberships.organizationId, organizationId)
        )
      )
      .returning();

    return updatedMembership;
  } else {
    // Create new membership
    const newMembership: MembershipInsert = {
      userId: targetUserId,
      organizationId,
      role,
      createdAt: now,
      updatedAt: now,
    };

    const [createdMembership] = await db
      .insert(memberships)
      .values(newMembership)
      .returning();

    return createdMembership;
  }
}

/**
 * Delete a user's membership from an organization
 *
 * Role-based permissions:
 * - Only owners and admins can remove memberships
 * - The organization owner cannot be removed
 * - Users cannot remove themselves
 * - Only owners can remove admins
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @param targetUserEmail Email of the user to remove from the organization
 * @param adminUserId User ID of the admin/owner making the change
 * @returns True if membership was deleted, false if permission denied or not found
 */
export async function deleteMembership(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string,
  targetUserEmail: string,
  adminUserId: string
): Promise<boolean> {
  // Get the organization ID first
  const [organization] = await db
    .select()
    .from(organizations)
    .where(getOrganizationCondition(organizationIdOrHandle))
    .limit(1);

  if (!organization) {
    return false; // Organization not found
  }

  const organizationId = organization.id;

  // Check if the admin user is the organization owner
  const isAdminOwner = await isOrganizationOwner(
    db,
    organizationId,
    adminUserId
  );

  // If not the owner, check if they have admin role
  let hasAdminRole = false;
  if (!isAdminOwner) {
    const [adminMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, adminUserId),
          eq(memberships.organizationId, organizationId),
          eq(memberships.role, OrganizationRole.ADMIN)
        )
      )
      .limit(1);
    hasAdminRole = !!adminMembership;
  }

  // Permission check: Only owners and admins can remove memberships
  if (!isAdminOwner && !hasAdminRole) {
    return false; // User doesn't have permission
  }

  // Look up the target user by email
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetUserEmail))
    .limit(1);

  if (!targetUser) {
    return false; // User not found with this email
  }

  const targetUserId = targetUser.id;

  // Prevent removing the organization owner
  const isTargetUserOwner = await isOrganizationOwner(
    db,
    organizationId,
    targetUserId
  );
  if (isTargetUserOwner) {
    return false; // Cannot remove the organization owner
  }

  // Prevent users from removing themselves
  if (targetUserId === adminUserId) {
    return false; // Users cannot remove their own membership
  }

  // Get the target user's membership to check their role
  const [targetMembership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, targetUserId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    return false; // Target user is not a member
  }

  // Only owners can remove admins
  if (targetMembership.role === OrganizationRole.ADMIN && !isAdminOwner) {
    return false; // Only owners can remove admins
  }

  // Delete the membership
  const [deletedMembership] = await db
    .delete(memberships)
    .where(
      and(
        eq(memberships.userId, targetUserId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .returning({ id: memberships.userId });

  return !!deletedMembership;
}

/**
 * List all memberships for an organization with user information
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of membership records with user details
 */
export async function getOrganizationMembershipsWithUsers(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  const results = await db
    .select({
      userId: memberships.userId,
      organizationId: memberships.organizationId,
      role: memberships.role,
      createdAt: memberships.createdAt,
      updatedAt: memberships.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(getOrganizationCondition(organizationIdOrHandle))
    .orderBy(memberships.createdAt);

  // Convert null values to undefined to match TypeScript interface
  return results.map((result) => ({
    ...result,
    user: {
      ...result.user,
      email: result.user.email ?? undefined,
      avatarUrl: result.user.avatarUrl ?? undefined,
    },
  }));
}

/**
 * Get workflow metadata from DB and full workflow data from R2
 *
 * @param db Database instance
 * @param objectStore ObjectStore instance for R2 operations
 * @param workflowIdOrHandle Workflow ID or handle
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Workflow metadata with full data from R2
 */
export async function getWorkflowWithData(
  db: ReturnType<typeof createDatabase>,
  objectStore: ObjectStore,
  workflowIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<(WorkflowRow & { data: WorkflowType }) | undefined> {
  const workflow = await getWorkflow(
    db,
    workflowIdOrHandle,
    organizationIdOrHandle
  );

  if (!workflow) {
    return undefined;
  }

  try {
    const workflowData = await objectStore.readWorkflow(workflow.id);
    return {
      ...workflow,
      data: workflowData,
    };
  } catch (error) {
    console.error(
      `Failed to read workflow data from R2 for ${workflow.id}:`,
      error
    );
    throw error;
  }
}

/**
 * Get deployment metadata from DB and workflow snapshot from R2
 *
 * @param db Database instance
 * @param objectStore ObjectStore instance for R2 operations
 * @param deploymentId Deployment ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Deployment metadata with workflow data from R2
 */
export async function getDeploymentWithData(
  db: ReturnType<typeof createDatabase>,
  objectStore: ObjectStore,
  deploymentId: string,
  organizationIdOrHandle: string
): Promise<(DeploymentRow & { workflowData: WorkflowType }) | undefined> {
  const deployment = await getDeployment(
    db,
    deploymentId,
    organizationIdOrHandle
  );

  if (!deployment) {
    return undefined;
  }

  try {
    const workflowData = await objectStore.readDeploymentWorkflow(
      deployment.id
    );
    return {
      ...deployment,
      workflowData,
    };
  } catch (error) {
    console.error(
      `Failed to read deployment workflow from R2 for ${deployment.id}:`,
      error
    );
    throw error;
  }
}

/**
 * Get execution metadata from DB and full execution data from R2
 *
 * @param db Database instance
 * @param objectStore ObjectStore instance for R2 operations
 * @param executionId Execution ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Execution metadata with full data from R2
 */
export async function getExecutionWithData(
  db: ReturnType<typeof createDatabase>,
  objectStore: ObjectStore,
  executionId: string,
  organizationIdOrHandle: string
): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined> {
  const execution = await getExecution(db, executionId, organizationIdOrHandle);

  if (!execution) {
    return undefined;
  }

  try {
    const executionData = await objectStore.readExecution(execution.id);
    return {
      ...execution,
      data: executionData,
    };
  } catch (error) {
    console.error(
      `Failed to read execution data from R2 for ${execution.id}:`,
      error
    );
    throw error;
  }
}
