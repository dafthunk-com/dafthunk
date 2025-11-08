import * as crypto from "crypto";
import { and, eq, lte } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { Bindings } from "../context";
import { encryptSecret } from "../utils/encryption";
import {
  type ApiKeyInsert,
  apiKeys,
  createDatabase,
  type DatasetInsert,
  type DatasetRow,
  datasets,
  type EmailInsert,
  type EmailRow,
  emails,
  type EmailTriggerInsert,
  type EmailTriggerRow,
  emailTriggers,
  type IntegrationInsert,
  integrations,
  type MembershipInsert,
  type MembershipRow,
  memberships,
  type OrganizationInsert,
  OrganizationRole,
  type OrganizationRoleType,
  organizations,
  Plan,
  type PlanType,
  type QueueInsert,
  type QueueRow,
  queues,
  type QueueTriggerInsert,
  type QueueTriggerRow,
  queueTriggers,
  type SecretInsert,
  secrets,
  UserRole,
  type UserRoleType,
  type UserRow,
  users,
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

export function getQueueCondition(queueIdOrHandle: string) {
  if (isUUID(queueIdOrHandle)) {
    return eq(queues.id, queueIdOrHandle);
  } else {
    return eq(queues.handle, queueIdOrHandle);
  }
}

export function getEmailCondition(emailIdOrHandle: string) {
  if (isUUID(emailIdOrHandle)) {
    return eq(emails.id, emailIdOrHandle);
  } else {
    return eq(emails.handle, emailIdOrHandle);
  }
}

/**
 * Get the latest deployment for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns The latest deployment or undefined if none found
 */

/**
 * Execution Operations
 */

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

/**
 * Create a new deployment
 *
 * @param db Database instance
 * @param newDeployment Deployment data
 * @returns The created deployment
 */

/**
 * Get deployments grouped by workflow
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of WorkflowDeployment objects
 */

/**
 * Get deployments for a workflow, sorted by creation date
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Array of deployment records
 */

/**
 * Get the latest version number for a workflow's deployments
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns The latest version number or null if no deployments exist
 */

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
 * Get all queues for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of queues with basic info
 */
export async function getQueues(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return await db
    .select({
      id: queues.id,
      name: queues.name,
      handle: queues.handle,
      createdAt: queues.createdAt,
      updatedAt: queues.updatedAt,
    })
    .from(queues)
    .innerJoin(
      organizations,
      and(
        eq(queues.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get a queue by ID or handle, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param queueIdOrHandle Queue ID or handle
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Queue record or undefined if not found
 */
export async function getQueue(
  db: ReturnType<typeof createDatabase>,
  queueIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<QueueRow | undefined> {
  const [queue] = await db
    .select()
    .from(queues)
    .innerJoin(
      organizations,
      and(
        eq(queues.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(getQueueCondition(queueIdOrHandle))
    .limit(1);
  return queue?.queues;
}

/**
 * Create a new queue
 *
 * @param db Database instance
 * @param newQueue Queue data to insert
 * @returns Created queue record
 */
export async function createQueue(
  db: ReturnType<typeof createDatabase>,
  newQueue: QueueInsert
): Promise<QueueRow> {
  const [queue] = await db.insert(queues).values(newQueue).returning();

  return queue;
}

/**
 * Update a queue, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Queue ID
 * @param organizationId Organization ID
 * @param data Updated queue data
 * @returns Updated queue record
 */
export async function updateQueue(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<QueueRow>
): Promise<QueueRow> {
  const [queue] = await db
    .update(queues)
    .set(data)
    .where(and(eq(queues.id, id), eq(queues.organizationId, organizationId)))
    .returning();

  return queue;
}

/**
 * Delete a queue, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Queue ID
 * @param organizationId Organization ID
 * @returns Deleted queue record
 */
export async function deleteQueue(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<QueueRow | undefined> {
  const [queue] = await db
    .delete(queues)
    .where(and(eq(queues.id, id), eq(queues.organizationId, organizationId)))
    .returning();

  return queue;
}

/**
 * Get all emails for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of emails with basic info
 */
export async function getEmails(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return await db
    .select({
      id: emails.id,
      name: emails.name,
      handle: emails.handle,
      createdAt: emails.createdAt,
      updatedAt: emails.updatedAt,
    })
    .from(emails)
    .innerJoin(
      organizations,
      and(
        eq(emails.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get an email by ID or handle, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param emailIdOrHandle Email ID or handle
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Email record or undefined if not found
 */
export async function getEmail(
  db: ReturnType<typeof createDatabase>,
  emailIdOrHandle: string,
  organizationIdOrHandle: string
): Promise<EmailRow | undefined> {
  const [email] = await db
    .select()
    .from(emails)
    .innerJoin(
      organizations,
      and(
        eq(emails.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    )
    .where(getEmailCondition(emailIdOrHandle))
    .limit(1);
  return email?.emails;
}

/**
 * Create a new email
 *
 * @param db Database instance
 * @param newEmail Email data to insert
 * @returns Created email record
 */
export async function createEmail(
  db: ReturnType<typeof createDatabase>,
  newEmail: EmailInsert
): Promise<EmailRow> {
  const [email] = await db.insert(emails).values(newEmail).returning();

  return email;
}

/**
 * Update an email, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Email ID
 * @param organizationId Organization ID
 * @param data Updated email data
 * @returns Updated email record
 */
export async function updateEmail(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<EmailRow>
): Promise<EmailRow> {
  const [email] = await db
    .update(emails)
    .set(data)
    .where(and(eq(emails.id, id), eq(emails.organizationId, organizationId)))
    .returning();

  return email;
}

/**
 * Delete an email, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Email ID
 * @param organizationId Organization ID
 * @returns Deleted email record
 */
export async function deleteEmail(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<EmailRow | undefined> {
  const [email] = await db
    .delete(emails)
    .where(and(eq(emails.id, id), eq(emails.organizationId, organizationId)))
    .returning();

  return email;
}

/**
 * Get a queue trigger for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Queue trigger record or undefined if not found
 */
export async function getQueueTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<QueueTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(queueTriggers)
    .innerJoin(workflows, eq(queueTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(queueTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.queue_triggers;
}

/**
 * Get all queue triggers for a specific queue
 *
 * @param db Database instance
 * @param queueId Queue ID
 * @param organizationId Organization ID
 * @returns Array of queue trigger records with workflow info
 */
export async function getQueueTriggersByQueue(
  db: ReturnType<typeof createDatabase>,
  queueId: string,
  organizationId: string
) {
  return await db
    .select({
      queueTrigger: queueTriggers,
      workflow: workflows,
    })
    .from(queueTriggers)
    .innerJoin(workflows, eq(queueTriggers.workflowId, workflows.id))
    .innerJoin(queues, eq(queueTriggers.queueId, queues.id))
    .where(
      and(
        eq(queueTriggers.queueId, queueId),
        eq(queueTriggers.active, true),
        eq(queues.organizationId, organizationId)
      )
    );
}

/**
 * Upsert a queue trigger for a workflow
 *
 * @param db Database instance
 * @param trigger Queue trigger data to insert or update
 * @returns Upserted queue trigger record
 */
export async function upsertQueueTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: QueueTriggerInsert
): Promise<QueueTriggerRow> {
  const [queueTrigger] = await db
    .insert(queueTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: queueTriggers.workflowId,
      set: {
        queueId: trigger.queueId,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return queueTrigger;
}

/**
 * Delete a queue trigger for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Deleted queue trigger record or undefined if not found
 */
export async function deleteQueueTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<QueueTriggerRow | undefined> {
  const [trigger] = await db
    .delete(queueTriggers)
    .where(
      and(
        eq(queueTriggers.workflowId, workflowId),
        eq(
          queueTriggers.workflowId,
          db
            .select({ id: workflows.id })
            .from(workflows)
            .where(
              and(
                eq(workflows.id, workflowId),
                eq(workflows.organizationId, organizationId)
              )
            )
        )
      )
    )
    .returning();

  return trigger;
}

/**
 * Get an email trigger for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Email trigger record or undefined if not found
 */
export async function getEmailTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<EmailTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(emailTriggers)
    .innerJoin(workflows, eq(emailTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(emailTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.email_triggers;
}

/**
 * Get all email triggers for a specific email
 *
 * @param db Database instance
 * @param emailId Email ID
 * @param organizationId Organization ID
 * @returns Array of email trigger records with workflow info
 */
export async function getEmailTriggersByEmail(
  db: ReturnType<typeof createDatabase>,
  emailId: string,
  organizationId: string
) {
  return await db
    .select({
      emailTrigger: emailTriggers,
      workflow: workflows,
    })
    .from(emailTriggers)
    .innerJoin(workflows, eq(emailTriggers.workflowId, workflows.id))
    .innerJoin(emails, eq(emailTriggers.emailId, emails.id))
    .where(
      and(
        eq(emailTriggers.emailId, emailId),
        eq(emailTriggers.active, true),
        eq(emails.organizationId, organizationId)
      )
    );
}

/**
 * Upsert an email trigger for a workflow
 *
 * @param db Database instance
 * @param trigger Email trigger data to insert or update
 * @returns Upserted email trigger record
 */
export async function upsertEmailTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: EmailTriggerInsert
): Promise<EmailTriggerRow> {
  const [emailTrigger] = await db
    .insert(emailTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: emailTriggers.workflowId,
      set: {
        emailId: trigger.emailId,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return emailTrigger;
}

/**
 * Delete an email trigger for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @param organizationId Organization ID
 * @returns Deleted email trigger record or undefined if not found
 */
export async function deleteEmailTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<EmailTriggerRow | undefined> {
  const [trigger] = await db
    .delete(emailTriggers)
    .where(
      and(
        eq(emailTriggers.workflowId, workflowId),
        eq(
          emailTriggers.workflowId,
          db
            .select({ id: workflows.id })
            .from(workflows)
            .where(
              and(
                eq(workflows.id, workflowId),
                eq(workflows.organizationId, organizationId)
              )
            )
        )
      )
    )
    .returning();

  return trigger;
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
 * Create a new integration for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param name Descriptive name for the integration
 * @param provider Integration provider type
 * @param token The access token to encrypt
 * @param refreshToken Optional refresh token to encrypt
 * @param tokenExpiresAt Optional token expiration timestamp
 * @param metadata Optional JSON metadata for provider-specific data
 * @param env Environment variables (for encryption key)
 * @returns Object containing the integration record and the unencrypted tokens
 */
export async function createIntegration(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  name: string,
  provider: any,
  token: string,
  refreshToken: string | undefined,
  tokenExpiresAt: Date | undefined,
  metadata: string | undefined,
  env: Bindings
) {
  const id = uuidv7();
  const now = new Date();

  // Encrypt the token using organization-specific key
  const encryptedToken = await encryptSecret(token, env, organizationId);

  // Encrypt refresh token if provided
  let encryptedRefreshToken: string | undefined;
  if (refreshToken) {
    encryptedRefreshToken = await encryptSecret(
      refreshToken,
      env,
      organizationId
    );
  }

  // Create the integration record
  const newIntegration: IntegrationInsert = {
    id,
    name,
    provider,
    encryptedToken,
    encryptedRefreshToken,
    tokenExpiresAt,
    metadata,
    organizationId,
    createdAt: now,
    updatedAt: now,
  };

  // Insert the integration record
  const [integrationRecord] = await db
    .insert(integrations)
    .values(newIntegration)
    .returning();

  // Return both the unencrypted tokens (only shown once) and the record
  return {
    token,
    refreshToken,
    integration: integrationRecord,
  };
}

/**
 * List integrations for an organization
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of integration records (without the encrypted tokens)
 */
export async function getIntegrations(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      status: integrations.status,
      tokenExpiresAt: integrations.tokenExpiresAt,
      metadata: integrations.metadata,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .innerJoin(
      organizations,
      and(
        eq(integrations.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get all integrations for an organization (including encrypted tokens)
 *
 * @param db Database instance
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Array of integration records with encrypted tokens
 */
export async function getAllIntegrationsWithTokens(
  db: ReturnType<typeof createDatabase>,
  organizationIdOrHandle: string
) {
  return db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      status: integrations.status,
      encryptedToken: integrations.encryptedToken,
      encryptedRefreshToken: integrations.encryptedRefreshToken,
      tokenExpiresAt: integrations.tokenExpiresAt,
      metadata: integrations.metadata,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .innerJoin(
      organizations,
      and(
        eq(integrations.organizationId, organizations.id),
        getOrganizationCondition(organizationIdOrHandle)
      )
    );
}

/**
 * Get an integration by ID (without the encrypted tokens)
 *
 * @param db Database instance
 * @param id Integration ID
 * @param organizationId Organization ID
 * @returns Integration record or null if not found
 */
export async function getIntegration(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
) {
  const [integration] = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      status: integrations.status,
      tokenExpiresAt: integrations.tokenExpiresAt,
      metadata: integrations.metadata,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.organizationId, organizationId)
      )
    )
    .limit(1);

  return integration || null;
}

/**
 * Get an integration by ID (with encrypted tokens for node execution)
 *
 * @param db Database instance
 * @param id Integration ID
 * @param organizationId Organization ID
 * @returns Integration record with encrypted tokens or null if not found
 */
export async function getIntegrationById(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
) {
  const [integration] = await db
    .select({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      status: integrations.status,
      encryptedToken: integrations.encryptedToken,
      encryptedRefreshToken: integrations.encryptedRefreshToken,
      tokenExpiresAt: integrations.tokenExpiresAt,
      metadata: integrations.metadata,
      organizationId: integrations.organizationId,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.organizationId, organizationId)
      )
    )
    .limit(1);

  return integration || null;
}

/**
 * Update an integration
 *
 * @param db Database instance
 * @param id Integration ID
 * @param organizationId Organization ID
 * @param updates Fields to update
 * @param env Environment variables (for encryption key)
 * @returns Updated integration record or null if not found
 */
export async function updateIntegration(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  updates: {
    name?: string;
    status?: string;
    token?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    metadata?: string;
  },
  env: Bindings
) {
  const now = new Date();
  const updateData: Partial<IntegrationInsert> = {
    updatedAt: now,
  };

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.status) {
    updateData.status = updates.status as any;
  }

  if (updates.token) {
    // Encrypt the new token using organization-specific key
    updateData.encryptedToken = await encryptSecret(
      updates.token,
      env,
      organizationId
    );
  }

  if (updates.refreshToken) {
    // Encrypt the new refresh token using organization-specific key
    updateData.encryptedRefreshToken = await encryptSecret(
      updates.refreshToken,
      env,
      organizationId
    );
  }

  if (updates.tokenExpiresAt !== undefined) {
    updateData.tokenExpiresAt = updates.tokenExpiresAt;
  }

  if (updates.metadata !== undefined) {
    updateData.metadata = updates.metadata;
  }

  const [updatedIntegration] = await db
    .update(integrations)
    .set(updateData)
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.organizationId, organizationId)
      )
    )
    .returning({
      id: integrations.id,
      name: integrations.name,
      provider: integrations.provider,
      status: integrations.status,
      tokenExpiresAt: integrations.tokenExpiresAt,
      metadata: integrations.metadata,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    });

  return updatedIntegration || null;
}

/**
 * Delete an integration
 *
 * @param db Database instance
 * @param id Integration ID
 * @param organizationId Organization ID
 * @returns True if integration was deleted, false if not found
 */
export async function deleteIntegration(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<boolean> {
  // Try to delete the integration by its ID and organization
  const [deletedIntegration] = await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.organizationId, organizationId)
      )
    )
    .returning({ id: integrations.id });

  // If we got a record back, it was deleted successfully
  return !!deletedIntegration;
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
 * Get deployment metadata from DB and workflow snapshot from R2
 *
 * @param db Database instance
 * @param objectStore ObjectStore instance for R2 operations
 * @param deploymentId Deployment ID
 * @param organizationIdOrHandle Organization ID or handle
 * @returns Deployment metadata with workflow data from R2
 */
