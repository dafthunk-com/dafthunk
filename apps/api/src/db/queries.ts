import {
  NodeExecution,
  Workflow as WorkflowType,
  WorkflowDeployment,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import * as crypto from "crypto";
import { and, desc, eq, inArray, lte, SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";

import {
  type ApiKeyInsert,
  apiKeys,
  createDatabase,
  type CronTriggerInsert,
  type CronTriggerRow,
  cronTriggers,
  type DeploymentInsert,
  type DeploymentRow,
  deployments,
  type ExecutionRow,
  executions,
  type ExecutionStatusType,
  type MembershipInsert,
  memberships,
  type OrganizationInsert,
  OrganizationRole,
  organizations,
  Plan,
  type PlanType,
  type ProviderType,
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
  visibility: "public" | "private";
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
  id: string;
  name: string;
  email?: string;
  provider: string;
  githubId?: string;
  googleId?: string;
  avatarUrl?: string;
  plan?: string;
  role?: string;
};

/**
 * Save a user to the database and ensure they belong to an organization
 *
 * @param db Database instance
 * @param userData User data to save
 * @returns Object containing the user and their main organization
 */
export async function saveUser(
  db: ReturnType<typeof createDatabase>,
  userData: UserData
): Promise<{ user: UserRow; organization: OrganizationInsert }> {
  const now = new Date();

  // Check if user already exists
  const existingUser = await getUserById(db, userData.id);

  if (existingUser) {
    // User exists, get their organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, existingUser.organizationId));

    return { user: existingUser, organization };
  }

  // User doesn't exist, create a new organization
  const organizationId = uuidv7();
  const handle = createHandle(userData.name);

  // Create personal organization
  const organization: OrganizationInsert = {
    id: organizationId,
    name: `Personal`,
    handle,
    createdAt: now,
    updatedAt: now,
  };

  // Create new user with the organization ID
  const newUser = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    provider: userData.provider as ProviderType,
    githubId: userData.githubId,
    googleId: userData.googleId,
    avatarUrl: userData.avatarUrl,
    organizationId: organizationId,
    plan: (userData.plan as PlanType) || Plan.TRIAL,
    role: (userData.role as UserRoleType) || UserRole.USER,
    inWaitlist: false,
    createdAt: now,
    updatedAt: now,
  };

  // Create membership with owner role
  const newMembership: MembershipInsert = {
    userId: userData.id,
    organizationId: organizationId,
    role: OrganizationRole.OWNER,
    createdAt: now,
    updatedAt: now,
  };

  // Execute all three operations in a single batch transaction
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

/**
 * Get a user by ID
 *
 * @param db Database instance
 * @param id User ID
 * @returns User record or undefined if not found
 */
export async function getUserById(
  db: ReturnType<typeof createDatabase>,
  id: string
): Promise<UserRow | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
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
      data: workflows.data,
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
 * Update a workflow, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Workflow ID
 * @param organizationId Organization ID
 * @param data Updated workflow data
 * @returns Updated workflow record
 */
export async function updateWorkflow(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<WorkflowRow> & { data: WorkflowType }
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
 * Save an execution record
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

  // Create the execution object that will be stored as JSON in the data field
  const executionData: WorkflowExecution = {
    id: record.id,
    workflowId: record.workflowId,
    deploymentId: record.deploymentId,
    status: record.status as WorkflowExecutionStatus,
    nodeExecutions,
    error: record.error,
    visibility: record.visibility,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };

  // Create the record to insert into the database
  const dbRecord = {
    ...dbFields,
    deploymentId: deploymentId,
    data: executionData,
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

  // Generate a secure random key
  const rawApiKey = crypto.randomBytes(32).toString("hex");

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
): Promise<WorkflowDeployment[]> {
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
 * Get an organization by its handle
 *
 * @param db Database instance
 * @param handle Organization handle
 * @returns Organization record or undefined if not found
 */
export async function getOrganization(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
): Promise<typeof organizations.$inferSelect | undefined> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(getOrganizationCondition(organizationIdOrHandle));

  return organization;
}

/**
 * Get a public execution by ID
 *
 * @param db Database instance
 * @param id Execution ID
 * @returns Execution record or undefined if not found or not public
 */
export async function getPublicExecution(
  db: ReturnType<typeof createDatabase>,
  id: string
): Promise<ExecutionRow | undefined> {
  const [execution] = await db
    .select()
    .from(executions)
    .where(and(eq(executions.id, id), eq(executions.visibility, "public")));

  return execution;
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
 * Update execution visibility to public
 *
 * @param db Database instance
 * @param executionId Execution ID
 * @param organizationId Organization ID
 * @returns The updated execution record
 */
export async function updateExecutionToPublic(
  db: ReturnType<typeof createDatabase>,
  executionId: string,
  organizationId: string
): Promise<ExecutionRow | undefined> {
  const [execution] = await db
    .update(executions)
    .set({ visibility: "public", updatedAt: new Date() })
    .where(
      and(
        eq(executions.id, executionId),
        eq(executions.organizationId, organizationId)
      )
    )
    .returning();

  return execution;
}

/**
 * Update execution visibility to private
 *
 * @param db Database instance
 * @param executionId Execution ID
 * @param organizationId Organization ID
 * @returns The updated execution record
 */
export async function updateExecutionToPrivate(
  db: ReturnType<typeof createDatabase>,
  executionId: string,
  organizationId: string
): Promise<ExecutionRow | undefined> {
  const [execution] = await db
    .update(executions)
    .set({ visibility: "private", updatedAt: new Date() })
    .where(
      and(
        eq(executions.id, executionId),
        eq(executions.organizationId, organizationId)
      )
    )
    .returning();

  return execution;
}

/**
 * Update execution OG image generation status
 *
 * @param db Database instance
 * @param executionId Execution ID
 * @returns The updated execution record
 */
export async function updateExecutionOgImageStatus(
  db: ReturnType<typeof createDatabase>,
  executionId: string
): Promise<ExecutionRow | undefined> {
  const [execution] = await db
    .update(executions)
    .set({ ogImageGenerated: true, updatedAt: new Date() })
    .where(eq(executions.id, executionId))
    .returning();

  return execution;
}

/**
 * Get execution with visibility check
 *
 * @param db Database instance
 * @param executionId Execution ID
 * @param organizationId Organization ID
 * @returns The execution record with visibility status
 */
export async function getExecutionWithVisibility(
  db: ReturnType<typeof createDatabase>,
  executionId: string,
  organizationId: string
): Promise<
  | { id: string; organizationId: string; ogImageGenerated: boolean | null }
  | undefined
> {
  const [execution] = await db
    .select({
      id: executions.id,
      organizationId: executions.organizationId,
      ogImageGenerated: executions.ogImageGenerated,
    })
    .from(executions)
    .where(
      and(
        eq(executions.id, executionId),
        eq(executions.organizationId, organizationId)
      )
    );

  return execution;
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
