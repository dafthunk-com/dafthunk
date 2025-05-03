import { and, eq, sql } from "drizzle-orm";
import { 
  createDatabase, 
  workflows, 
  executions,
  users,
  organizations,
  memberships,
  type NewWorkflow,
  type Workflow,
  type NewOrganization,
  type NewMembership,
  Plan,
  UserRole,
  OrganizationRole,
  type ProviderType,
  type PlanType,
  type UserRoleType 
} from "../db";
import { Workflow as WorkflowType, WorkflowExecution } from "@dafthunk/types";
import { ExecutionStatusType } from "../db/schema";
import { nanoid } from "nanoid";

/**
 * Data required to save an execution record
 */
export type SaveExecutionRecord = {
  id: string;
  workflowId: string;
  userId: string;
  organizationId: string;
  status: ExecutionStatusType;
  nodeExecutions: any[];
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
 * @returns The ID of the organization the user belongs to
 */
export async function saveUser(
  db: ReturnType<typeof createDatabase>,
  userData: UserData
): Promise<string> {
  const now = new Date();
  
  // Insert or update user
  await db
    .insert(users)
    .values({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      provider: userData.provider as ProviderType,
      githubId: userData.githubId,
      googleId: userData.googleId,
      avatarUrl: userData.avatarUrl,
      plan: (userData.plan as PlanType) || Plan.TRIAL,
      role: (userData.role as UserRoleType) || UserRole.USER,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: userData.name,
        email: userData.email,
        githubId: userData.githubId,
        googleId: userData.googleId,
        avatarUrl: userData.avatarUrl,
        plan: (userData.plan as PlanType) || Plan.TRIAL,
        role: (userData.role as UserRoleType) || UserRole.USER,
        updatedAt: now,
      },
    });
    
  // Check if user already exists in any organization
  const existingMemberships = await db
    .select()
    .from(memberships)
    .where(sql`${memberships.userId} = ${userData.id}`);
    
  // If user has no organizations, create a personal one
  if (existingMemberships.length === 0) {
    const orgId = nanoid();
    
    // Create personal organization
    const newOrg: NewOrganization = {
      id: orgId,
      name: `Personal`,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(organizations).values(newOrg);
    
    // Create membership with owner role
    const newMembership: NewMembership = {
      userId: userData.id,
      organizationId: orgId,
      role: OrganizationRole.OWNER,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(memberships).values(newMembership);
    
    return orgId;
  }
  
  return existingMemberships[0].organizationId;
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
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  
  return user;
}

/**
 * Get all organizations a user belongs to
 * 
 * @param db Database instance
 * @param userId User ID
 * @returns Array of organizations and the user's role in each
 */
export async function getUserOrganizations(
  db: ReturnType<typeof createDatabase>,
  userId: string
) {
  return db
    .select({
      organization: organizations,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(
      organizations, 
      eq(memberships.organizationId, organizations.id)
    )
    .where(eq(memberships.userId, userId));
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
 * @param id Workflow ID
 * @param organizationId Organization ID
 * @returns Workflow record or undefined if not found
 */
export async function getWorkflowById(
  db: ReturnType<typeof createDatabase>, 
  id: string, 
  organizationId: string
) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.organizationId, organizationId)));
  
  return workflow;
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
) {
  const [workflow] = await db
    .insert(workflows)
    .values(newWorkflow)
    .returning();
  
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
) {
  const [workflow] = await db
    .update(workflows)
    .set(data)
    .where(and(eq(workflows.id, id), eq(workflows.organizationId, organizationId)))
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
) {
  const [workflow] = await db
    .delete(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.organizationId, organizationId)))
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
) {
  const execution = await db
    .select()
    .from(executions)
    .where(
      and(
        eq(executions.id, id),
        eq(executions.organizationId, organizationId)
      )
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
  const { nodeExecutions, userId, ...dbFields } = record;
  
  // Create the execution object that will be stored as JSON in the data field
  const executionData: WorkflowExecution = {
    id: record.id,
    workflowId: record.workflowId,
    status: record.status,
    nodeExecutions,
    error: record.error,
  };

  // Create the record to insert into the database
  const dbRecord = {
    ...dbFields,
    data: executionData,
    updatedAt: record.updatedAt ?? now,
    createdAt: record.createdAt ?? now,
  };

  await db
    .insert(executions)
    .values(dbRecord)
    .onConflictDoUpdate({ target: executions.id, set: dbRecord });

  return executionData;
}

/**
 * Update an execution's status, ensuring it belongs to the specified organization
 * 
 * @param db Database instance
 * @param id Execution ID
 * @param organizationId Organization ID
 * @param status New execution status
 * @param errorMessage Optional error message
 * @returns Updated execution record
 */
export async function updateExecutionStatus(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  status: ExecutionStatusType,
  errorMessage?: string
) {
  const [execution] = await db
    .update(executions)
    .set({ 
      status, 
      error: errorMessage,
      updatedAt: new Date() 
    })
    .where(
      and(
        eq(executions.id, id),
        eq(executions.organizationId, organizationId)
      )
    )
    .returning();
  
  return execution;
} 