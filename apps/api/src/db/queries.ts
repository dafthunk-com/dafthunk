import * as crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

import { TRIAL_CREDITS } from "../constants/billing";
import { Bindings } from "../context";
import { encryptSecret } from "../utils/encryption";
import {
  type ApiKeyInsert,
  apiKeys,
  createDatabase,
  type DatabaseInsert,
  type DatabaseRow,
  type DatasetInsert,
  type DatasetRow,
  type DiscordBotInsert,
  type DiscordBotRow,
  type DiscordTriggerInsert,
  type DiscordTriggerRow,
  databases,
  datasets,
  discordBots,
  discordTriggers,
  type EmailInsert,
  type EmailRow,
  type EmailTriggerInsert,
  type EmailTriggerRow,
  type EndpointInsert,
  type EndpointRow,
  type EndpointTriggerInsert,
  type EndpointTriggerRow,
  emails,
  emailTriggers,
  endpoints,
  endpointTriggers,
  type IntegrationInsert,
  type IntegrationProviderType,
  type IntegrationStatusType,
  type InvitationInsert,
  type InvitationRow,
  InvitationStatus,
  integrations,
  invitations,
  type MembershipInsert,
  type MembershipRow,
  memberships,
  type OrganizationInsert,
  OrganizationRole,
  type OrganizationRoleType,
  organizations,
  type QueueInsert,
  type QueueRow,
  type QueueTriggerInsert,
  type QueueTriggerRow,
  queues,
  queueTriggers,
  type ScheduledTriggerInsert,
  type ScheduledTriggerRow,
  type SchemaInsert,
  type SchemaRow,
  type SecretInsert,
  type SenderEmailStatusType,
  scheduledTriggers,
  schemas,
  secrets,
  type TelegramBotInsert,
  type TelegramBotRow,
  type TelegramTriggerInsert,
  type TelegramTriggerRow,
  telegramBots,
  telegramTriggers,
  UserRole,
  type UserRoleType,
  type UserRow,
  users,
  type WhatsAppAccountInsert,
  type WhatsAppAccountRow,
  type WhatsAppTriggerInsert,
  type WhatsAppTriggerRow,
  whatsappAccounts,
  whatsappTriggers,
  workflows,
} from "./index";

/**
 * Data required to save a user record
 */
export type UserData = {
  provider: "github" | "google";
  providerId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
};

/**
 * Check if a user exists by provider ID
 */
export async function userExists(
  db: ReturnType<typeof createDatabase>,
  provider: "github" | "google",
  providerId: string
): Promise<boolean> {
  const providerColumn =
    provider === "github" ? users.githubId : users.googleId;
  const [result] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(providerColumn, providerId))
    .limit(1);
  return !!result;
}

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
  const organization: OrganizationInsert = {
    id: organizationId,
    name: `Personal`,
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
 * Get an organization by ID
 */
export async function getOrganization(
  db: ReturnType<typeof createDatabase>,
  id: string
) {
  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * API Key Operations
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
 * @param organizationId The ID of the organization to verify against
 * @returns The organization ID if the key is valid for the organization, null otherwise
 */
export async function verifyApiKey(
  db: ReturnType<typeof createDatabase>,
  providedApiKey: string,
  organizationId: string
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
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

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
 * Roll an API key - generate a new secret for an existing key
 *
 * @param db Database instance
 * @param id Key ID
 * @param organizationId Organization ID
 * @returns Object containing the new raw key and the updated record, or null if not found
 */
export async function rollApiKey(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<{
  rawApiKey: string;
  apiKey: { id: string; name: string; createdAt: Date; updatedAt: Date };
} | null> {
  const now = new Date();

  // Generate a new secure random key with prefix
  const rawKeyBytes = crypto.randomBytes(32).toString("hex");
  const rawApiKey = `dk_${rawKeyBytes}`;

  // Hash the new key for storage
  const hashedApiKey = crypto
    .createHash("sha256")
    .update(rawApiKey)
    .digest("hex");

  // Update the key record
  const [updatedApiKey] = await db
    .update(apiKeys)
    .set({
      key: hashedApiKey,
      updatedAt: now,
    })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    });

  if (!updatedApiKey) {
    return null;
  }

  return {
    rawApiKey,
    apiKey: updatedApiKey,
  };
}

/**
 * Get all datasets for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of datasets with basic info
 */
export async function getDatasets(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: datasets.id,
      name: datasets.name,
      createdAt: datasets.createdAt,
      updatedAt: datasets.updatedAt,
    })
    .from(datasets)
    .where(eq(datasets.organizationId, organizationId));
}

/**
 * Get a dataset by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param datasetId Dataset ID
 * @param organizationId Organization ID
 * @returns Dataset record or undefined if not found
 */
export async function getDataset(
  db: ReturnType<typeof createDatabase>,
  datasetId: string,
  organizationId: string
): Promise<DatasetRow | undefined> {
  const [dataset] = await db
    .select()
    .from(datasets)
    .where(
      and(
        eq(datasets.id, datasetId),
        eq(datasets.organizationId, organizationId)
      )
    )
    .limit(1);
  return dataset;
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
 * @param organizationId Organization ID
 * @returns Array of queues with basic info
 */
export async function getQueues(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: queues.id,
      name: queues.name,
      createdAt: queues.createdAt,
      updatedAt: queues.updatedAt,
    })
    .from(queues)
    .where(eq(queues.organizationId, organizationId));
}

/**
 * Get a queue by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param queueId Queue ID
 * @param organizationId Organization ID
 * @returns Queue record or undefined if not found
 */
export async function getQueueById(
  db: ReturnType<typeof createDatabase>,
  queueId: string
): Promise<QueueRow | undefined> {
  const [queue] = await db
    .select()
    .from(queues)
    .where(eq(queues.id, queueId))
    .limit(1);
  return queue;
}

export async function getQueue(
  db: ReturnType<typeof createDatabase>,
  queueId: string,
  organizationId: string
): Promise<QueueRow | undefined> {
  const [queue] = await db
    .select()
    .from(queues)
    .where(
      and(eq(queues.id, queueId), eq(queues.organizationId, organizationId))
    )
    .limit(1);
  return queue;
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
 * Get all databases for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of databases with basic info
 */
export async function getDatabases(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: databases.id,
      name: databases.name,
      createdAt: databases.createdAt,
      updatedAt: databases.updatedAt,
    })
    .from(databases)
    .where(eq(databases.organizationId, organizationId));
}

/**
 * Get a database by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param databaseId Database ID
 * @param organizationId Organization ID
 * @returns Database record or undefined if not found
 */
export async function getDatabase(
  db: ReturnType<typeof createDatabase>,
  databaseId: string,
  organizationId: string
): Promise<DatabaseRow | undefined> {
  const [database] = await db
    .select()
    .from(databases)
    .where(
      and(
        eq(databases.id, databaseId),
        eq(databases.organizationId, organizationId)
      )
    )
    .limit(1);
  return database;
}

/**
 * Create a new database record
 *
 * @param db Database instance
 * @param newDatabase Database data to insert
 * @returns Created database record
 */
export async function createDatabaseRecord(
  db: ReturnType<typeof createDatabase>,
  newDatabase: DatabaseInsert
): Promise<DatabaseRow> {
  const [database] = await db.insert(databases).values(newDatabase).returning();

  return database;
}

/**
 * Update a database record, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Database ID
 * @param organizationId Organization ID
 * @param data Updated database data
 * @returns Updated database record
 */
export async function updateDatabaseRecord(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<DatabaseRow>
): Promise<DatabaseRow> {
  const [database] = await db
    .update(databases)
    .set(data)
    .where(
      and(eq(databases.id, id), eq(databases.organizationId, organizationId))
    )
    .returning();

  return database;
}

/**
 * Delete a database record, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param id Database ID
 * @param organizationId Organization ID
 * @returns Deleted database record
 */
export async function deleteDatabaseRecord(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<DatabaseRow | undefined> {
  const [database] = await db
    .delete(databases)
    .where(
      and(eq(databases.id, id), eq(databases.organizationId, organizationId))
    )
    .returning();

  return database;
}

/**
 * Get all schemas for an organization
 */
export async function getSchemas(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: schemas.id,
      name: schemas.name,
      description: schemas.description,
      fields: schemas.fields,
      createdAt: schemas.createdAt,
      updatedAt: schemas.updatedAt,
    })
    .from(schemas)
    .where(eq(schemas.organizationId, organizationId));
}

/**
 * Get a schema by ID, ensuring it belongs to the specified organization
 */
export async function getSchema(
  db: ReturnType<typeof createDatabase>,
  schemaId: string,
  organizationId: string
): Promise<SchemaRow | undefined> {
  const [schema] = await db
    .select()
    .from(schemas)
    .where(
      and(eq(schemas.id, schemaId), eq(schemas.organizationId, organizationId))
    )
    .limit(1);
  return schema;
}

/**
 * Create a new schema record
 */
export async function createSchemaRecord(
  db: ReturnType<typeof createDatabase>,
  newSchema: SchemaInsert
): Promise<SchemaRow> {
  const [schema] = await db.insert(schemas).values(newSchema).returning();
  return schema;
}

/**
 * Update a schema record, ensuring it belongs to the specified organization
 */
export async function updateSchemaRecord(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<SchemaRow>
): Promise<SchemaRow> {
  const [schema] = await db
    .update(schemas)
    .set(data)
    .where(and(eq(schemas.id, id), eq(schemas.organizationId, organizationId)))
    .returning();
  return schema;
}

/**
 * Delete a schema record, ensuring it belongs to the specified organization
 */
export async function deleteSchemaRecord(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<SchemaRow | undefined> {
  const [schema] = await db
    .delete(schemas)
    .where(and(eq(schemas.id, id), eq(schemas.organizationId, organizationId)))
    .returning();
  return schema;
}

/**
 * Get all emails for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of emails with basic info
 */
export async function getEmails(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: emails.id,
      name: emails.name,
      senderEmail: emails.senderEmail,
      senderEmailStatus: emails.senderEmailStatus,
      createdAt: emails.createdAt,
      updatedAt: emails.updatedAt,
    })
    .from(emails)
    .where(eq(emails.organizationId, organizationId));
}

/**
 * Get an email by ID, ensuring it belongs to the specified organization
 *
 * @param db Database instance
 * @param emailId Email ID
 * @param organizationId Organization ID
 * @returns Email record or undefined if not found
 */
export async function getEmailById(
  db: ReturnType<typeof createDatabase>,
  emailId: string
): Promise<EmailRow | undefined> {
  const [email] = await db
    .select()
    .from(emails)
    .where(eq(emails.id, emailId))
    .limit(1);
  return email;
}

export async function getEmail(
  db: ReturnType<typeof createDatabase>,
  emailId: string,
  organizationId: string
): Promise<EmailRow | undefined> {
  const [email] = await db
    .select()
    .from(emails)
    .where(
      and(eq(emails.id, emailId), eq(emails.organizationId, organizationId))
    )
    .limit(1);
  return email;
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
 * Endpoint Operations
 */

export async function getEndpoints(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: endpoints.id,
      name: endpoints.name,
      mode: endpoints.mode,
      createdAt: endpoints.createdAt,
      updatedAt: endpoints.updatedAt,
    })
    .from(endpoints)
    .where(eq(endpoints.organizationId, organizationId))
    .orderBy(endpoints.createdAt);
}

export async function getEndpointById(
  db: ReturnType<typeof createDatabase>,
  endpointId: string
): Promise<EndpointRow | undefined> {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, endpointId))
    .limit(1);
  return endpoint;
}

export async function getEndpoint(
  db: ReturnType<typeof createDatabase>,
  endpointId: string,
  organizationId: string
): Promise<EndpointRow | undefined> {
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(
      and(
        eq(endpoints.id, endpointId),
        eq(endpoints.organizationId, organizationId)
      )
    )
    .limit(1);
  return endpoint;
}

export async function createEndpoint(
  db: ReturnType<typeof createDatabase>,
  newEndpoint: EndpointInsert
): Promise<EndpointRow> {
  const [endpoint] = await db.insert(endpoints).values(newEndpoint).returning();

  return endpoint;
}

export async function updateEndpoint(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<EndpointRow>
): Promise<EndpointRow> {
  const [endpoint] = await db
    .update(endpoints)
    .set(data)
    .where(
      and(eq(endpoints.id, id), eq(endpoints.organizationId, organizationId))
    )
    .returning();

  return endpoint;
}

export async function deleteEndpoint(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<EndpointRow | undefined> {
  const [endpoint] = await db
    .delete(endpoints)
    .where(
      and(eq(endpoints.id, id), eq(endpoints.organizationId, organizationId))
    )
    .returning();

  return endpoint;
}

/**
 * Endpoint Trigger Operations
 */

export async function getEndpointTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<EndpointTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(endpointTriggers)
    .innerJoin(workflows, eq(endpointTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(endpointTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.endpoint_triggers;
}

export async function getEndpointTriggersByEndpoint(
  db: ReturnType<typeof createDatabase>,
  endpointId: string,
  organizationId: string
) {
  return await db
    .select({
      endpointTrigger: endpointTriggers,
      workflow: workflows,
    })
    .from(endpointTriggers)
    .innerJoin(workflows, eq(endpointTriggers.workflowId, workflows.id))
    .innerJoin(endpoints, eq(endpointTriggers.endpointId, endpoints.id))
    .where(
      and(
        eq(endpointTriggers.endpointId, endpointId),
        eq(endpointTriggers.active, true),
        eq(endpoints.organizationId, organizationId)
      )
    );
}

export async function upsertEndpointTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: EndpointTriggerInsert
): Promise<EndpointTriggerRow> {
  const [endpointTrigger] = await db
    .insert(endpointTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: endpointTriggers.workflowId,
      set: {
        endpointId: trigger.endpointId,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return endpointTrigger;
}

export async function deleteEndpointTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<EndpointTriggerRow | undefined> {
  const [trigger] = await db
    .delete(endpointTriggers)
    .where(
      and(
        eq(endpointTriggers.workflowId, workflowId),
        eq(
          endpointTriggers.workflowId,
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
 * Discord Bot Operations
 */

export async function getDiscordBots(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: discordBots.id,
      name: discordBots.name,
      applicationId: discordBots.applicationId,
      publicKey: discordBots.publicKey,
      tokenLastFour: discordBots.tokenLastFour,
      createdAt: discordBots.createdAt,
      updatedAt: discordBots.updatedAt,
    })
    .from(discordBots)
    .where(eq(discordBots.organizationId, organizationId));
}

export async function getDiscordBot(
  db: ReturnType<typeof createDatabase>,
  discordBotId: string,
  organizationId: string
): Promise<DiscordBotRow | undefined> {
  const [bot] = await db
    .select()
    .from(discordBots)
    .where(
      and(
        eq(discordBots.id, discordBotId),
        eq(discordBots.organizationId, organizationId)
      )
    )
    .limit(1);
  return bot;
}

export async function createDiscordBot(
  db: ReturnType<typeof createDatabase>,
  newBot: DiscordBotInsert
): Promise<DiscordBotRow> {
  const [bot] = await db.insert(discordBots).values(newBot).returning();
  return bot;
}

export async function updateDiscordBot(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<DiscordBotRow>
): Promise<DiscordBotRow> {
  const [bot] = await db
    .update(discordBots)
    .set(data)
    .where(
      and(
        eq(discordBots.id, id),
        eq(discordBots.organizationId, organizationId)
      )
    )
    .returning();
  return bot;
}

export async function deleteDiscordBot(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<DiscordBotRow | undefined> {
  const [bot] = await db
    .delete(discordBots)
    .where(
      and(
        eq(discordBots.id, id),
        eq(discordBots.organizationId, organizationId)
      )
    )
    .returning();
  return bot;
}

/**
 * Telegram Bot Operations
 */

export async function getTelegramBots(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: telegramBots.id,
      name: telegramBots.name,
      botUsername: telegramBots.botUsername,
      tokenLastFour: telegramBots.tokenLastFour,
      createdAt: telegramBots.createdAt,
      updatedAt: telegramBots.updatedAt,
    })
    .from(telegramBots)
    .where(eq(telegramBots.organizationId, organizationId));
}

export async function getTelegramBot(
  db: ReturnType<typeof createDatabase>,
  telegramBotId: string,
  organizationId: string
): Promise<TelegramBotRow | undefined> {
  const [bot] = await db
    .select()
    .from(telegramBots)
    .where(
      and(
        eq(telegramBots.id, telegramBotId),
        eq(telegramBots.organizationId, organizationId)
      )
    )
    .limit(1);
  return bot;
}

export async function createTelegramBot(
  db: ReturnType<typeof createDatabase>,
  newBot: TelegramBotInsert
): Promise<TelegramBotRow> {
  const [bot] = await db.insert(telegramBots).values(newBot).returning();
  return bot;
}

export async function updateTelegramBot(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<TelegramBotRow>
): Promise<TelegramBotRow> {
  const [bot] = await db
    .update(telegramBots)
    .set(data)
    .where(
      and(
        eq(telegramBots.id, id),
        eq(telegramBots.organizationId, organizationId)
      )
    )
    .returning();
  return bot;
}

export async function deleteTelegramBot(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<TelegramBotRow | undefined> {
  const [bot] = await db
    .delete(telegramBots)
    .where(
      and(
        eq(telegramBots.id, id),
        eq(telegramBots.organizationId, organizationId)
      )
    )
    .returning();
  return bot;
}

/**
 * Get a discord trigger for a workflow
 */
export async function getDiscordTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<DiscordTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(discordTriggers)
    .innerJoin(workflows, eq(discordTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(discordTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.discord_triggers;
}

/**
 * Get all active discord triggers for a bot + command name
 */
export async function getDiscordTriggersByBot(
  db: ReturnType<typeof createDatabase>,
  discordBotId: string,
  commandName: string
) {
  return await db
    .select({
      discordTrigger: discordTriggers,
      workflow: workflows,
    })
    .from(discordTriggers)
    .innerJoin(workflows, eq(discordTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(discordTriggers.discordBotId, discordBotId),
        eq(discordTriggers.commandName, commandName),
        eq(discordTriggers.active, true)
      )
    );
}

/**
 * Get a discord bot by ID without org scoping (for webhook handler)
 */
export async function getDiscordBotById(
  db: ReturnType<typeof createDatabase>,
  discordBotId: string
): Promise<DiscordBotRow | undefined> {
  const [bot] = await db
    .select()
    .from(discordBots)
    .where(eq(discordBots.id, discordBotId))
    .limit(1);
  return bot;
}

/**
 * Upsert a discord trigger for a workflow
 */
export async function upsertDiscordTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: DiscordTriggerInsert
): Promise<DiscordTriggerRow> {
  const [discordTrigger] = await db
    .insert(discordTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: discordTriggers.workflowId,
      set: {
        commandName: trigger.commandName,
        commandDescription: trigger.commandDescription,
        discordBotId: trigger.discordBotId,
        guildId: trigger.guildId,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return discordTrigger;
}

/**
 * Delete a discord trigger for a workflow
 */
export async function deleteDiscordTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<DiscordTriggerRow | undefined> {
  const [trigger] = await db
    .delete(discordTriggers)
    .where(
      and(
        eq(discordTriggers.workflowId, workflowId),
        eq(
          discordTriggers.workflowId,
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
 * Get a telegram trigger for a workflow
 */
export async function getTelegramTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<TelegramTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(telegramTriggers)
    .innerJoin(workflows, eq(telegramTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(telegramTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.telegram_triggers;
}

/**
 * Get all active telegram triggers for a bot, optionally filtered by chat ID.
 * Triggers with no chatId match any chat.
 */
export async function getTelegramTriggersByBot(
  db: ReturnType<typeof createDatabase>,
  telegramBotId: string,
  chatId?: string
) {
  const results = await db
    .select({
      telegramTrigger: telegramTriggers,
      workflow: workflows,
    })
    .from(telegramTriggers)
    .innerJoin(workflows, eq(telegramTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(telegramTriggers.telegramBotId, telegramBotId),
        eq(telegramTriggers.active, true)
      )
    );

  if (!chatId) return results;

  // Return triggers that either match the specific chatId or have no chatId filter
  return results.filter(
    (r) => !r.telegramTrigger.chatId || r.telegramTrigger.chatId === chatId
  );
}

/**
 * Get the secret token for a telegram bot trigger (for webhook verification)
 */
export async function getTelegramSecretTokenByBot(
  db: ReturnType<typeof createDatabase>,
  telegramBotId: string
): Promise<string | undefined> {
  const [result] = await db
    .select({ secretToken: telegramTriggers.secretToken })
    .from(telegramTriggers)
    .where(
      and(
        eq(telegramTriggers.telegramBotId, telegramBotId),
        eq(telegramTriggers.active, true)
      )
    )
    .limit(1);

  return result?.secretToken ?? undefined;
}

/**
 * Upsert a telegram trigger for a workflow
 */
export async function upsertTelegramTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: TelegramTriggerInsert
): Promise<TelegramTriggerRow> {
  const [telegramTrigger] = await db
    .insert(telegramTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: telegramTriggers.workflowId,
      set: {
        chatId: trigger.chatId ?? null,
        telegramBotId: trigger.telegramBotId,
        secretToken: trigger.secretToken,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return telegramTrigger;
}

/**
 * Update the secret token for all triggers using a specific bot.
 * Needed because Telegram only allows one webhook (and one secret) per bot.
 */
export async function updateTelegramBotSecretToken(
  db: ReturnType<typeof createDatabase>,
  telegramBotId: string,
  secretToken: string
): Promise<void> {
  await db
    .update(telegramTriggers)
    .set({ secretToken, updatedAt: new Date() })
    .where(eq(telegramTriggers.telegramBotId, telegramBotId));
}

/**
 * Delete a telegram trigger for a workflow
 */
export async function deleteTelegramTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<TelegramTriggerRow | undefined> {
  const [trigger] = await db
    .delete(telegramTriggers)
    .where(
      and(
        eq(telegramTriggers.workflowId, workflowId),
        eq(
          telegramTriggers.workflowId,
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

// ── WhatsApp Accounts ──────────────────────────────────────────────────

export async function getWhatsAppAccounts(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return await db
    .select({
      id: whatsappAccounts.id,
      name: whatsappAccounts.name,
      phoneNumberId: whatsappAccounts.phoneNumberId,
      wabaId: whatsappAccounts.wabaId,
      tokenLastFour: whatsappAccounts.tokenLastFour,
      createdAt: whatsappAccounts.createdAt,
      updatedAt: whatsappAccounts.updatedAt,
    })
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.organizationId, organizationId));
}

export async function getWhatsAppAccount(
  db: ReturnType<typeof createDatabase>,
  whatsappAccountId: string,
  organizationId: string
): Promise<WhatsAppAccountRow | undefined> {
  const [account] = await db
    .select()
    .from(whatsappAccounts)
    .where(
      and(
        eq(whatsappAccounts.id, whatsappAccountId),
        eq(whatsappAccounts.organizationId, organizationId)
      )
    )
    .limit(1);
  return account;
}

export async function createWhatsAppAccount(
  db: ReturnType<typeof createDatabase>,
  newAccount: WhatsAppAccountInsert
): Promise<WhatsAppAccountRow> {
  const [account] = await db
    .insert(whatsappAccounts)
    .values(newAccount)
    .returning();
  return account;
}

export async function updateWhatsAppAccount(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string,
  data: Partial<WhatsAppAccountRow>
): Promise<WhatsAppAccountRow> {
  const [account] = await db
    .update(whatsappAccounts)
    .set(data)
    .where(
      and(
        eq(whatsappAccounts.id, id),
        eq(whatsappAccounts.organizationId, organizationId)
      )
    )
    .returning();
  return account;
}

export async function deleteWhatsAppAccount(
  db: ReturnType<typeof createDatabase>,
  id: string,
  organizationId: string
): Promise<WhatsAppAccountRow | undefined> {
  const [account] = await db
    .delete(whatsappAccounts)
    .where(
      and(
        eq(whatsappAccounts.id, id),
        eq(whatsappAccounts.organizationId, organizationId)
      )
    )
    .returning();
  return account;
}

// ── WhatsApp Triggers ──────────────────────────────────────────────────

/**
 * Get a whatsapp trigger for a workflow
 */
export async function getWhatsAppTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<WhatsAppTriggerRow | undefined> {
  const [trigger] = await db
    .select()
    .from(whatsappTriggers)
    .innerJoin(workflows, eq(whatsappTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(whatsappTriggers.workflowId, workflowId),
        eq(workflows.organizationId, organizationId)
      )
    )
    .limit(1);

  return trigger?.whatsapp_triggers;
}

/**
 * Get all active whatsapp triggers for an account, optionally filtered by phone number ID.
 * Triggers with no phoneNumberId match any phone number.
 */
export async function getWhatsAppTriggersByAccount(
  db: ReturnType<typeof createDatabase>,
  whatsappAccountId: string
) {
  const results = await db
    .select({
      whatsappTrigger: whatsappTriggers,
      workflow: workflows,
    })
    .from(whatsappTriggers)
    .innerJoin(workflows, eq(whatsappTriggers.workflowId, workflows.id))
    .where(
      and(
        eq(whatsappTriggers.whatsappAccountId, whatsappAccountId),
        eq(whatsappTriggers.active, true)
      )
    );

  return results;
}

/**
 * Get the verify token for a whatsapp account trigger (for webhook verification)
 */
export async function getWhatsAppVerifyTokenByAccount(
  db: ReturnType<typeof createDatabase>,
  whatsappAccountId: string
): Promise<string | undefined> {
  const [result] = await db
    .select({ verifyToken: whatsappTriggers.verifyToken })
    .from(whatsappTriggers)
    .where(
      and(
        eq(whatsappTriggers.whatsappAccountId, whatsappAccountId),
        eq(whatsappTriggers.active, true)
      )
    )
    .limit(1);
  return result?.verifyToken ?? undefined;
}

/**
 * Upsert a whatsapp trigger for a workflow
 */
export async function upsertWhatsAppTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: WhatsAppTriggerInsert
): Promise<WhatsAppTriggerRow> {
  const [whatsappTrigger] = await db
    .insert(whatsappTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: whatsappTriggers.workflowId,
      set: {
        phoneNumberId: trigger.phoneNumberId ?? null,
        whatsappAccountId: trigger.whatsappAccountId,
        verifyToken: trigger.verifyToken,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return whatsappTrigger;
}

/**
 * Update verify token for all triggers using a whatsapp account
 */
export async function updateWhatsAppAccountVerifyToken(
  db: ReturnType<typeof createDatabase>,
  whatsappAccountId: string,
  verifyToken: string
): Promise<void> {
  await db
    .update(whatsappTriggers)
    .set({ verifyToken, updatedAt: new Date() })
    .where(eq(whatsappTriggers.whatsappAccountId, whatsappAccountId));
}

/**
 * Delete a whatsapp trigger for a workflow
 */
export async function deleteWhatsAppTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string,
  organizationId: string
): Promise<WhatsAppTriggerRow | undefined> {
  const [trigger] = await db
    .delete(whatsappTriggers)
    .where(
      and(
        eq(whatsappTriggers.workflowId, workflowId),
        eq(
          whatsappTriggers.workflowId,
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
 * Get ALL active scheduled triggers (for scheduled worker)
 *
 * @param db Database instance
 * @returns Array of scheduled trigger records with workflow info
 */
export async function getActiveScheduledTriggers(
  db: ReturnType<typeof createDatabase>
) {
  return await db
    .select({
      scheduledTrigger: scheduledTriggers,
      workflow: workflows,
    })
    .from(scheduledTriggers)
    .innerJoin(workflows, eq(scheduledTriggers.workflowId, workflows.id))
    .where(eq(scheduledTriggers.active, true));
}

/**
 * Upsert a scheduled trigger for a workflow
 *
 * @param db Database instance
 * @param trigger Scheduled trigger data to insert or update
 * @returns Upserted scheduled trigger record
 */
export async function upsertScheduledTrigger(
  db: ReturnType<typeof createDatabase>,
  trigger: ScheduledTriggerInsert
): Promise<ScheduledTriggerRow> {
  const [scheduledTrigger] = await db
    .insert(scheduledTriggers)
    .values(trigger)
    .onConflictDoUpdate({
      target: scheduledTriggers.workflowId,
      set: {
        scheduleExpression: trigger.scheduleExpression,
        active: trigger.active,
        updatedAt: new Date(),
      },
    })
    .returning();

  return scheduledTrigger;
}

/**
 * Delete a scheduled trigger for a workflow
 *
 * @param db Database instance
 * @param workflowId Workflow ID
 * @returns Deleted scheduled trigger record or undefined if not found
 */
export async function deleteScheduledTrigger(
  db: ReturnType<typeof createDatabase>,
  workflowId: string
): Promise<ScheduledTriggerRow | undefined> {
  const [trigger] = await db
    .delete(scheduledTriggers)
    .where(eq(scheduledTriggers.workflowId, workflowId))
    .returning();

  return trigger;
}

/**
 * Get an organization's compute credits
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Organization's compute credits or undefined if not found
 */
export async function getOrganizationComputeCredits(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
): Promise<number | undefined> {
  const [organization] = await db
    .select({ computeCredits: organizations.computeCredits })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return organization?.computeCredits;
}

/**
 * Get organization billing info for workflow execution
 */
export async function getOrganizationBillingInfo(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
): Promise<
  | {
      computeCredits: number;
      subscriptionStatus: string | null;
      currentPeriodEnd: Date | null;
      overageLimit: number | null;
    }
  | undefined
> {
  const [organization] = await db
    .select({
      computeCredits: organizations.computeCredits,
      subscriptionStatus: organizations.subscriptionStatus,
      currentPeriodEnd: organizations.currentPeriodEnd,
      overageLimit: organizations.overageLimit,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return organization;
}

/**
 * Get the sender email configuration for an email
 */
export async function getEmailSenderEmail(
  db: ReturnType<typeof createDatabase>,
  emailId: string,
  organizationId: string
): Promise<
  | {
      senderEmail: string | null;
      senderEmailStatus: SenderEmailStatusType | null;
    }
  | undefined
> {
  const [email] = await db
    .select({
      senderEmail: emails.senderEmail,
      senderEmailStatus: emails.senderEmailStatus,
    })
    .from(emails)
    .where(
      and(eq(emails.id, emailId), eq(emails.organizationId, organizationId))
    )
    .limit(1);
  return email;
}

/**
 * Update the sender email and status for an email
 */
export async function updateEmailSenderEmail(
  db: ReturnType<typeof createDatabase>,
  emailId: string,
  organizationId: string,
  senderEmailAddress: string,
  status: SenderEmailStatusType
) {
  await db
    .update(emails)
    .set({
      senderEmail: senderEmailAddress,
      senderEmailStatus: status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(emails.id, emailId), eq(emails.organizationId, organizationId))
    );
}

/**
 * Clear the sender email configuration for an email
 */
export async function clearEmailSenderEmail(
  db: ReturnType<typeof createDatabase>,
  emailId: string,
  organizationId: string
) {
  await db
    .update(emails)
    .set({
      senderEmail: null,
      senderEmailStatus: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(emails.id, emailId), eq(emails.organizationId, organizationId))
    );
}

/**
 * Derive user plan from organization billing info.
 * Pro if has active subscription OR canceled but still in billing period.
 * In non-production environments, always grants pro so all nodes are available during development.
 */
export function resolveOrganizationPlan(
  billingInfo: {
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | null;
  },
  cloudflareEnv?: string
): string {
  if (cloudflareEnv && cloudflareEnv !== "production") {
    return "pro";
  }
  const hasProAccess =
    billingInfo.subscriptionStatus === "active" ||
    (billingInfo.subscriptionStatus === "canceled" &&
      billingInfo.currentPeriodEnd !== null &&
      billingInfo.currentPeriodEnd > new Date());
  return hasProAccess ? "pro" : "trial";
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
 * @param organizationId Organization ID
 * @returns Array of secret records (without the encrypted value)
 */
export async function getSecrets(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  return db
    .select({
      id: secrets.id,
      name: secrets.name,
      createdAt: secrets.createdAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .where(eq(secrets.organizationId, organizationId));
}

/**
 * Get all encrypted secrets for an organization (including encrypted values)
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of secret records with encrypted values
 */
export async function getAllSecretsWithValues(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
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
    .where(eq(secrets.organizationId, organizationId));
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
  provider: IntegrationProviderType,
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
 * @param organizationId Organization ID
 * @returns Array of integration records (without the encrypted tokens)
 */
export async function getIntegrations(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
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
    .where(eq(integrations.organizationId, organizationId));
}

/**
 * Get all integrations for an organization (including encrypted tokens)
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of integration records with encrypted tokens
 */
export async function getAllIntegrationsWithTokens(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
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
    .where(eq(integrations.organizationId, organizationId));
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
 * Get the first active integration for a provider in an organization (with encrypted token)
 */
export async function getIntegrationByProvider(
  db: ReturnType<typeof createDatabase>,
  provider: IntegrationProviderType,
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
        eq(integrations.provider, provider),
        eq(integrations.organizationId, organizationId),
        eq(integrations.status, "active")
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
    updateData.status = updates.status as IntegrationStatusType;
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
 * @param creatorUserId User ID of the creator who will become the owner
 * @returns Object containing the created organization and membership
 */
export async function createOrganization(
  db: ReturnType<typeof createDatabase>,
  name: string,
  creatorUserId: string
): Promise<{
  organization: OrganizationInsert;
  membership: MembershipInsert;
}> {
  const now = new Date();
  const organizationId = uuidv7();

  const organization: OrganizationInsert = {
    id: organizationId,
    name,
    computeCredits: TRIAL_CREDITS, // Default compute credits for new orgs
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
 * @param organizationId Organization ID
 * @param userId User ID attempting to delete
 * @returns True if organization was deleted, false if not found or user is not owner
 */
export async function deleteOrganization(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  userId: string
): Promise<boolean> {
  // First, verify the user is the owner of the organization
  const isOwner = await isOrganizationOwner(db, organizationId, userId);

  if (!isOwner) {
    return false; // User is not the owner or organization doesn't exist
  }

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
 * Check if a user is an admin or owner of an organization
 */
export async function isOrganizationAdminOrOwner(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  return (
    membership?.role === OrganizationRole.OWNER ||
    membership?.role === OrganizationRole.ADMIN
  );
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
 * @param organizationId Organization ID
 * @param targetUserEmail Email of the user to add/update membership for
 * @param role Role to assign (member, admin, owner)
 * @param adminUserId User ID of the admin/owner making the change
 * @returns The created or updated membership record, or null if permission denied or user not found
 */
export async function addOrUpdateMembership(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  targetUserEmail: string,
  role: OrganizationRoleType,
  adminUserId: string
): Promise<MembershipRow | null> {
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
 * @param organizationId Organization ID
 * @param targetUserEmail Email of the user to remove from the organization
 * @param adminUserId User ID of the admin/owner making the change
 * @returns True if membership was deleted, false if permission denied or not found
 */
export async function deleteMembership(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  targetUserEmail: string,
  adminUserId: string
): Promise<boolean> {
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
 * @param organizationId Organization ID
 * @returns Array of membership records with user details
 */
/**
 * Check whether a user belongs to an organization.
 */
export async function isOrganizationMember(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const row = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .get();

  return !!row;
}

export async function getOrganizationMembershipsWithUsers(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
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
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, organizationId))
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
 * Invitation Operations
 */

/**
 * Create an invitation to join an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @param email Email of the user to invite
 * @param role Role to assign when invitation is accepted
 * @param invitedByUserId User ID of the person sending the invitation
 * @param expiresInDays Number of days until the invitation expires (default: 7)
 * @returns The created invitation or null if permission denied
 */
export async function createInvitation(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  email: string,
  role: OrganizationRoleType,
  invitedByUserId: string,
  expiresInDays: number = 7
): Promise<InvitationRow | null> {
  // Check if the inviter is the organization owner
  const isInviterOwner = await isOrganizationOwner(
    db,
    organizationId,
    invitedByUserId
  );

  // If not the owner, check if they have admin role
  let hasAdminRole = false;
  if (!isInviterOwner) {
    const [adminMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, invitedByUserId),
          eq(memberships.organizationId, organizationId),
          eq(memberships.role, OrganizationRole.ADMIN)
        )
      )
      .limit(1);
    hasAdminRole = !!adminMembership;
  }

  // Permission check: Only owners and admins can create invitations
  if (!isInviterOwner && !hasAdminRole) {
    return null; // User doesn't have permission
  }

  // Role assignment restrictions
  if (role === OrganizationRole.OWNER) {
    return null; // Owner role cannot be assigned via invitation
  }

  if (role === OrganizationRole.ADMIN && !isInviterOwner) {
    return null; // Only owners can invite admins
  }

  // Check if user is already a member
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, existingUser.id),
          eq(memberships.organizationId, organizationId)
        )
      )
      .limit(1);

    if (existingMembership) {
      return null; // User is already a member
    }
  }

  // Check if there's already a pending invitation for this email
  const [existingInvitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.organizationId, organizationId),
        eq(invitations.status, InvitationStatus.PENDING)
      )
    )
    .limit(1);

  if (existingInvitation) {
    return null; // Pending invitation already exists
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
  );

  const newInvitation: InvitationInsert = {
    id: uuidv7(),
    email,
    organizationId,
    role,
    status: InvitationStatus.PENDING,
    invitedBy: invitedByUserId,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const [invitation] = await db
    .insert(invitations)
    .values(newInvitation)
    .returning();

  return invitation;
}

/**
 * Get all pending invitations for an organization
 *
 * @param db Database instance
 * @param organizationId Organization ID
 * @returns Array of invitation records with inviter info
 */
export async function getOrganizationInvitations(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
) {
  const results = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      organizationId: invitations.organizationId,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      updatedAt: invitations.updatedAt,
      inviter: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(invitations)
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.status, InvitationStatus.PENDING)
      )
    )
    .orderBy(invitations.createdAt);

  return results.map((result) => ({
    ...result,
    inviter: {
      ...result.inviter,
      email: result.inviter.email ?? undefined,
      avatarUrl: result.inviter.avatarUrl ?? undefined,
    },
  }));
}

/**
 * Get all pending invitations for a user by email
 *
 * @param db Database instance
 * @param email User's email address
 * @returns Array of invitation records with organization info
 */
export async function getUserInvitations(
  db: ReturnType<typeof createDatabase>,
  email: string
) {
  const now = new Date();

  const results = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      updatedAt: invitations.updatedAt,
      organization: {
        id: organizations.id,
        name: organizations.name,
      },
      inviter: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(invitations)
    .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
    .innerJoin(users, eq(invitations.invitedBy, users.id))
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.status, InvitationStatus.PENDING)
      )
    )
    .orderBy(invitations.createdAt);

  // Filter out expired invitations
  return results
    .filter((result) => result.expiresAt > now)
    .map((result) => ({
      ...result,
      inviter: {
        ...result.inviter,
        avatarUrl: result.inviter.avatarUrl ?? undefined,
      },
    }));
}

/**
 * Accept an invitation and create membership
 *
 * @param db Database instance
 * @param invitationId Invitation ID
 * @param userId User ID accepting the invitation
 * @returns The created membership or null if failed
 */
export async function acceptInvitation(
  db: ReturnType<typeof createDatabase>,
  invitationId: string,
  userId: string
): Promise<MembershipRow | null> {
  // Get the invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invitation) {
    return null; // Invitation not found
  }

  // Check if invitation is still pending
  if (invitation.status !== InvitationStatus.PENDING) {
    return null; // Invitation is no longer pending
  }

  // Check if invitation has expired
  const now = new Date();
  if (invitation.expiresAt < now) {
    // Mark as expired
    await db
      .update(invitations)
      .set({ status: InvitationStatus.EXPIRED, updatedAt: now })
      .where(eq(invitations.id, invitationId));
    return null; // Invitation has expired
  }

  // Get the user to verify email matches
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.email !== invitation.email) {
    return null; // User email doesn't match invitation
  }

  // Check if user is already a member
  const [existingMembership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, invitation.organizationId)
      )
    )
    .limit(1);

  if (existingMembership) {
    // Mark invitation as accepted anyway
    await db
      .update(invitations)
      .set({ status: InvitationStatus.ACCEPTED, updatedAt: now })
      .where(eq(invitations.id, invitationId));
    return existingMembership; // Return existing membership
  }

  // Create the membership
  const newMembership: MembershipInsert = {
    userId,
    organizationId: invitation.organizationId,
    role: invitation.role,
    createdAt: now,
    updatedAt: now,
  };

  // Use batch for atomicity
  const [membershipResult, _] = await db.batch([
    db.insert(memberships).values(newMembership).returning(),
    db
      .update(invitations)
      .set({ status: InvitationStatus.ACCEPTED, updatedAt: now })
      .where(eq(invitations.id, invitationId)),
  ]);

  return membershipResult[0];
}

/**
 * Decline an invitation
 *
 * @param db Database instance
 * @param invitationId Invitation ID
 * @param userId User ID declining the invitation
 * @returns True if invitation was declined, false if failed
 */
export async function declineInvitation(
  db: ReturnType<typeof createDatabase>,
  invitationId: string,
  userId: string
): Promise<boolean> {
  // Get the invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invitation) {
    return false; // Invitation not found
  }

  // Check if invitation is still pending
  if (invitation.status !== InvitationStatus.PENDING) {
    return false; // Invitation is no longer pending
  }

  // Get the user to verify email matches
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.email !== invitation.email) {
    return false; // User email doesn't match invitation
  }

  const now = new Date();

  // Update invitation status
  await db
    .update(invitations)
    .set({ status: InvitationStatus.DECLINED, updatedAt: now })
    .where(eq(invitations.id, invitationId));

  return true;
}

/**
 * Cancel/delete an invitation (admin action)
 *
 * @param db Database instance
 * @param invitationId Invitation ID
 * @param organizationId Organization ID
 * @param adminUserId User ID of the admin canceling the invitation
 * @returns True if invitation was deleted, false if failed
 */
export async function deleteInvitation(
  db: ReturnType<typeof createDatabase>,
  invitationId: string,
  organizationId: string,
  adminUserId: string
): Promise<boolean> {
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

  // Permission check: Only owners and admins can cancel invitations
  if (!isAdminOwner && !hasAdminRole) {
    return false; // User doesn't have permission
  }

  // Delete the invitation
  const [deletedInvitation] = await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, organizationId)
      )
    )
    .returning({ id: invitations.id });

  return !!deletedInvitation;
}
