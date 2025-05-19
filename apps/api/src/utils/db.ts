import {
  NodeExecution,
  Workflow as WorkflowType,
  WorkflowDeployment,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import * as crypto from "crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import {
  apiKeys,
  createDatabase,
  type Deployment,
  deployments,
  type Execution,
  executions,
  type ExecutionStatusType,
  memberships,
  type NewApiKey,
  type NewDeployment,
  type NewMembership,
  type NewOrganization,
  type NewWorkflow,
  OrganizationRole,
  organizations,
  Plan,
  type PlanType,
  type ProviderType,
  type User,
  UserRole,
  type UserRoleType,
  users,
  type Workflow,
  workflows,
} from "../db";

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
): Promise<{ user: User; organization: NewOrganization }> {
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
  const organization: NewOrganization = {
    id: organizationId,
    name: `Personal`,
    handle,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(organizations).values(organization);

  // Create new user with the organization ID
  const [user] = await db
    .insert(users)
    .values({
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
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create membership with owner role
  const newMembership: NewMembership = {
    userId: userData.id,
    organizationId: organizationId,
    role: OrganizationRole.OWNER,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(memberships).values(newMembership);

  return { user, organization };
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
): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));

  return user;
}

/**
 * Get all workflows for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of workflows with basic info
 */
export async function getWorkflowsByOrganization(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return db
    .select({
      id: workflows.id,
      name: workflows.name,
      handle: workflows.handle,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    })
    .from(workflows)
    .where(eq(workflows.organizationId, organizationId));
}

/**
 * Get a workflow by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param idOrHandle Workflow ID or handle
 * @param organizationId Organization ID
 * @returns Workflow record or undefined if not found
 */
export async function getWorkflowByIdOrHandle(
  db: ReturnType<typeof createDatabase>,
  idOrHandle: string,
  organizationId: string
): Promise<Workflow | undefined> {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(
      and(
        or(eq(workflows.id, idOrHandle), eq(workflows.handle, idOrHandle)),
        eq(workflows.organizationId, organizationId)
      )
    );
  return workflow;
}

/**
 * Get a workflow by ID
 *
 * @param db Database instance
 * @param idOrHandle Workflow ID
 * @returns Workflow record or undefined if not found
 */
export async function getWorkflowById(
  db: ReturnType<typeof createDatabase>,
  id: string
): Promise<Workflow | undefined> {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id)));
  return workflow;
}

export async function getLatestDeploymentByWorkflowId(
  db: ReturnType<typeof createDatabase>,
  workflowId: string
): Promise<Deployment | undefined> {
  const [deployment] = await db
    .select()
    .from(deployments)
    .where(eq(deployments.workflowId, workflowId))
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  return deployment;
}

export async function getDeploymentByWorkflowIdAndVersion(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  version: string
): Promise<Deployment | undefined> {
  const [deployment] = await db
    .select()
    .from(deployments)
    .innerJoin(
      workflows,
      and(
        eq(deployments.workflowId, workflows.id),
        eq(workflows.id, workflows.id)
      )
    )
    .where(eq(deployments.version, parseInt(version, 10)));

  return deployment?.deployments;
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
  newWorkflow: NewWorkflow
): Promise<Workflow> {
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
  data: Partial<Workflow> & { data: WorkflowType }
): Promise<Workflow> {
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
): Promise<Workflow | undefined> {
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
export async function getExecutionById(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<Execution | undefined> {
  const execution = await db
    .select()
    .from(executions)
    .where(
      and(eq(executions.id, id), eq(executions.organizationId, organizationId))
    )
    .get();

  return execution;
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
  const newApiKey: NewApiKey = {
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
 * Verify an API key
 *
 * @param db Database instance
 * @param providedApiKey The key provided in the request
 * @returns The organization ID if key is valid, null otherwise
 */
export async function verifyApiKey(
  db: ReturnType<typeof createDatabase>,
  providedApiKey: string
): Promise<string | null> {
  // Hash the provided key directly without attempting to handle any prefix
  const hashedApiKey = crypto
    .createHash("sha256")
    .update(providedApiKey)
    .digest("hex");

  // Find the key in the database
  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      organizationId: apiKeys.organizationId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.key, hashedApiKey));

  // Check if key exists
  if (!apiKey) {
    return null;
  }

  return apiKey.organizationId;
}

/**
 * List API keys for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of API key records (without the key hash)
 */
export async function getApiKeys(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, organizationId));
}

/**
 * Delete an API key
 *
 * @param db Database instance
 * @param id Key ID
 * @param organizationId Organization ID
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
 * Get the latest deployment for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID for security checks
 * @returns The latest deployment or undefined if none found
 */
export async function getLatestDeploymentByWorkflowIdOrHandle(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<Deployment | undefined> {
  const [deployment] = await db
    .select()
    .from(deployments)
    .innerJoin(
      workflows,
      and(
        eq(deployments.workflowId, workflows.id),
        eq(workflows.organizationId, organizationId),
        or(eq(workflows.id, workflowId), eq(workflows.handle, workflowId))
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  return deployment?.deployments;
}

/**
 * Get a deployment by its ID
 *
 * @param db Database instance
 * @param id Deployment ID
 * @param organizationId Organization ID for security checks
 * @returns The deployment or undefined if not found
 */
export async function getDeploymentById(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<Deployment | undefined> {
  const [deployment] = await db
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.id, id),
        eq(deployments.organizationId, organizationId)
      )
    );

  return deployment;
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
  newDeployment: NewDeployment
): Promise<Deployment> {
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
  organizationId: string
): Promise<WorkflowDeployment[]> {
  // First get all workflows that belong to the organization
  const workflowsList = await db
    .select({
      id: workflows.id,
      name: workflows.name,
    })
    .from(workflows)
    .where(eq(workflows.organizationId, organizationId));

  // Create a result array to store our response
  const result: WorkflowDeployment[] = [];

  // For each workflow, get the deployment count and latest deployment
  for (const workflow of workflowsList) {
    const deploymentsList = await db
      .select()
      .from(deployments)
      .where(
        and(
          eq(deployments.workflowId, workflow.id),
          eq(deployments.organizationId, organizationId)
        )
      )
      .orderBy(desc(deployments.createdAt));

    if (deploymentsList.length > 0) {
      result.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        latestDeploymentId: deploymentsList[0].id,
        latestVersion: deploymentsList[0].version,
        deploymentCount: deploymentsList.length,
      });
    }
  }

  return result;
}

/**
 * Get deployments for a workflow, sorted by creation date
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Array of deployment records
 */
export async function getDeploymentsByWorkflowId(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<Deployment[]> {
  return db
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.workflowId, workflowId),
        eq(deployments.organizationId, organizationId)
      )
    )
    .orderBy(desc(deployments.createdAt));
}

/**
 * Get the latest version number for a workflow's deployments
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns The latest version number or null if no deployments exist
 */
export async function getLatestVersionNumberByWorkflowId(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<number | null> {
  const result = await db
    .select({
      maxVersion: sql<number>`MAX(${deployments.version})`,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.workflowId, workflowId),
        eq(deployments.organizationId, organizationId)
      )
    );

  return result[0]?.maxVersion || null;
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
  organizationId: string,
  options?: {
    workflowId?: string;
    deploymentId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Execution[]> {
  return db.query.executions.findMany({
    where: (executions, { eq, and }) =>
      and(
        eq(executions.organizationId, organizationId),
        options?.workflowId
          ? eq(executions.workflowId, options.workflowId)
          : undefined,
        options?.deploymentId
          ? eq(executions.deploymentId, options.deploymentId)
          : undefined
      ),
    orderBy: (executions, { desc }) => [desc(executions.createdAt)],
    limit: options?.limit,
    offset: options?.offset,
  });
}

export async function getDeploymentByWorkflowIdOrHandleAndVersion(
  db: ReturnType<typeof createDatabase>,
  workflowIdOrHandle: string,
  version: string,
  organizationId: string
) {
  const [deployment] = await db
    .select()
    .from(deployments)
    .innerJoin(
      workflows,
      and(
        eq(deployments.workflowId, workflows.id),
        eq(workflows.organizationId, organizationId),
        or(
          eq(workflows.id, workflowIdOrHandle),
          eq(workflows.handle, workflowIdOrHandle)
        )
      )
    )
    .where(eq(deployments.version, parseInt(version, 10)));

  return deployment?.deployments;
}

/**
 * Get an organization by its handle
 *
 * @param db Database instance
 * @param handle Organization handle
 * @returns Organization record or undefined if not found
 */
export async function getOrganizationByHandle(
  db: ReturnType<typeof createDatabase>,
  handle: string
): Promise<typeof organizations.$inferSelect | undefined> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.handle, handle));

  return organization;
}

/**
 * Get an organization by its id
 *
 * @param db Database instance
 * @param handle Organization id
 * @returns Organization record or undefined if not found
 */
export async function getOrganizationById(
  db: ReturnType<typeof createDatabase>,
  id: string
): Promise<typeof organizations.$inferSelect | undefined> {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));

  return organization;
}
