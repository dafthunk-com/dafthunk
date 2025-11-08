import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * ENUMS & CONSTANTS
 */

// Subscription plan types
export const Plan = {
  TRIAL: "trial",
  FREE: "free",
  PRO: "pro",
} as const;

export type PlanType = (typeof Plan)[keyof typeof Plan];

// User permission roles
export const UserRole = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Organization member roles
export const OrganizationRole = {
  MEMBER: "member",
  ADMIN: "admin",
  OWNER: "owner",
} as const;

export type OrganizationRoleType =
  (typeof OrganizationRole)[keyof typeof OrganizationRole];

// Authentication providers
export const Provider = {
  GITHUB: "github",
  GOOGLE: "google",
} as const;

export type ProviderType = (typeof Provider)[keyof typeof Provider];

// Workflow trigger types
export const WorkflowTriggerType = {
  MANUAL: "manual",
  HTTP_REQUEST: "http_request",
  EMAIL_MESSAGE: "email_message",
  CRON: "cron",
  QUEUE_MESSAGE: "queue_message",
} as const;

export type WorkflowTriggerTypeType =
  (typeof WorkflowTriggerType)[keyof typeof WorkflowTriggerType];

// Integration provider types
export const IntegrationProvider = {
  GOOGLE_MAIL: "google-mail",
  GOOGLE_CALENDAR: "google-calendar",
  DISCORD: "discord",
  GITHUB: "github",
  REDDIT: "reddit",
  LINKEDIN: "linkedin",
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GEMINI: "gemini",
} as const;

export type IntegrationProviderType =
  (typeof IntegrationProvider)[keyof typeof IntegrationProvider];

// Integration status types
export const IntegrationStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;

export type IntegrationStatusType =
  (typeof IntegrationStatus)[keyof typeof IntegrationStatus];

/**
 * REUSABLE COLUMNS
 */

const createCreatedAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

const createUpdatedAt = () =>
  integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/**
 * SCHEMA DEFINITION
 */

// Organizations - Collaborative workspaces for teams
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull().unique(),
    computeCredits: integer("compute_credits").notNull().default(1000),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("organizations_name_idx").on(table.name),
    index("organizations_handle_idx").on(table.handle),
    index("organizations_created_at_idx").on(table.createdAt),
  ]
);

// Users - System users with authentication and subscription details
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique(),
    githubId: text("github_id").unique(),
    googleId: text("google_id").unique(),
    avatarUrl: text("avatar_url"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    plan: text("plan").$type<PlanType>().notNull().default(Plan.TRIAL),
    role: text("role").$type<UserRoleType>().notNull().default(UserRole.USER),
    developerMode: integer("developer_mode", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("users_github_id_idx").on(table.githubId),
    index("users_google_id_idx").on(table.googleId),
    index("users_organization_id_idx").on(table.organizationId),
    index("users_email_idx").on(table.email),
    index("users_name_idx").on(table.name),
    index("users_plan_idx").on(table.plan),
    index("users_role_idx").on(table.role),
    index("users_developer_mode_idx").on(table.developerMode),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

// Memberships - Join table for users and organizations (many-to-many)
export const memberships = sqliteTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role")
      .$type<OrganizationRoleType>()
      .notNull()
      .default(OrganizationRole.MEMBER),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.organizationId] }),
    index("memberships_role_idx").on(table.role),
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_organization_id_idx").on(table.organizationId),
    index("memberships_created_at_idx").on(table.createdAt),
  ]
);

// API Keys - Authentication keys associated with organizations
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("api_keys_name_idx").on(table.name),
    index("api_keys_organization_id_idx").on(table.organizationId),
    index("api_keys_created_at_idx").on(table.createdAt),
  ]
);

// Workflows - Workflow definitions created and edited by users
// Note: Full workflow data is stored in R2, only metadata is in the database
export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    handle: text("handle").notNull(),
    type: text("type")
      .$type<WorkflowTriggerTypeType>()
      .notNull()
      .default(WorkflowTriggerType.MANUAL),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    activeDeploymentId: text("active_deployment_id").references(
      () => deployments.id,
      { onDelete: "set null" }
    ),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("workflows_name_idx").on(table.name),
    index("workflows_type_idx").on(table.type),
    index("workflows_organization_id_idx").on(table.organizationId),
    index("workflows_active_deployment_id_idx").on(table.activeDeploymentId),
    index("workflows_created_at_idx").on(table.createdAt),
    index("workflows_updated_at_idx").on(table.updatedAt),
    uniqueIndex("workflows_organization_id_handle_unique_idx").on(
      table.organizationId,
      table.handle
    ),
  ]
);

// Deployments - Versioned workflow definitions ready for execution
// Note: Workflow snapshot is stored in R2, only metadata is in the database
export const deployments = sqliteTable(
  "deployments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id").references(() => workflows.id, {
      onDelete: "cascade",
    }),
    version: integer("version").notNull(),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("deployments_organization_id_idx").on(table.organizationId),
    index("deployments_workflow_id_idx").on(table.workflowId),
    index("deployments_version_idx").on(table.version),
    index("deployments_created_at_idx").on(table.createdAt),
    // Composite index for finding latest deployment per workflow
    index("deployments_workflow_id_version_idx").on(
      table.workflowId,
      table.version
    ),
  ]
);

// Cron Triggers - Scheduled triggers for workflows
export const cronTriggers = sqliteTable(
  "cron_triggers",
  {
    workflowId: text("workflow_id")
      .primaryKey()
      .references(() => workflows.id, { onDelete: "cascade" }),
    cronExpression: text("cron_expression").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("cron_triggers_workflow_id_idx").on(table.workflowId),
    index("cron_triggers_active_idx").on(table.active),
    index("cron_triggers_created_at_idx").on(table.createdAt),
    index("cron_triggers_updated_at_idx").on(table.updatedAt),
  ]
);

// Datasets - Data collections associated with organizations
export const datasets = sqliteTable(
  "datasets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("datasets_name_idx").on(table.name),
    index("datasets_handle_idx").on(table.handle),
    index("datasets_organization_id_idx").on(table.organizationId),
    index("datasets_created_at_idx").on(table.createdAt),
    uniqueIndex("datasets_organization_id_handle_unique_idx").on(
      table.organizationId,
      table.handle
    ),
  ]
);

// Queues - Message queues associated with organizations
export const queues = sqliteTable(
  "queues",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("queues_name_idx").on(table.name),
    index("queues_handle_idx").on(table.handle),
    index("queues_organization_id_idx").on(table.organizationId),
    index("queues_created_at_idx").on(table.createdAt),
    uniqueIndex("queues_organization_id_handle_unique_idx").on(
      table.organizationId,
      table.handle
    ),
  ]
);

// Queue Triggers - Message queue triggers for workflows
export const queueTriggers = sqliteTable(
  "queue_triggers",
  {
    workflowId: text("workflow_id")
      .primaryKey()
      .references(() => workflows.id, { onDelete: "cascade" }),
    queueId: text("queue_id")
      .notNull()
      .references(() => queues.id, { onDelete: "cascade" }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("queue_triggers_workflow_id_idx").on(table.workflowId),
    index("queue_triggers_queue_id_idx").on(table.queueId),
    index("queue_triggers_active_idx").on(table.active),
    index("queue_triggers_created_at_idx").on(table.createdAt),
    index("queue_triggers_updated_at_idx").on(table.updatedAt),
  ]
);

// Emails - Email inboxes associated with organizations
export const emails = sqliteTable(
  "emails",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("emails_name_idx").on(table.name),
    index("emails_handle_idx").on(table.handle),
    index("emails_organization_id_idx").on(table.organizationId),
    index("emails_created_at_idx").on(table.createdAt),
    uniqueIndex("emails_organization_id_handle_unique_idx").on(
      table.organizationId,
      table.handle
    ),
  ]
);

// Email Triggers - Email inbox triggers for workflows
export const emailTriggers = sqliteTable(
  "email_triggers",
  {
    workflowId: text("workflow_id")
      .primaryKey()
      .references(() => workflows.id, { onDelete: "cascade" }),
    emailId: text("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("email_triggers_workflow_id_idx").on(table.workflowId),
    index("email_triggers_email_id_idx").on(table.emailId),
    index("email_triggers_active_idx").on(table.active),
    index("email_triggers_created_at_idx").on(table.createdAt),
    index("email_triggers_updated_at_idx").on(table.updatedAt),
  ]
);

// Secrets - Encrypted secrets associated with organizations
export const secrets = sqliteTable(
  "secrets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("secrets_name_idx").on(table.name),
    index("secrets_organization_id_idx").on(table.organizationId),
    index("secrets_created_at_idx").on(table.createdAt),
    // Ensure unique secret names per organization
    uniqueIndex("secrets_organization_id_name_unique_idx").on(
      table.organizationId,
      table.name
    ),
  ]
);

// Integrations - Third-party service connections with OAuth tokens
export const integrations = sqliteTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    provider: text("provider").$type<IntegrationProviderType>().notNull(),
    status: text("status")
      .$type<IntegrationStatusType>()
      .notNull()
      .default(IntegrationStatus.ACTIVE),
    encryptedToken: text("encrypted_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
    metadata: text("metadata"), // JSON for provider-specific data
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("integrations_name_idx").on(table.name),
    index("integrations_provider_idx").on(table.provider),
    index("integrations_status_idx").on(table.status),
    index("integrations_organization_id_idx").on(table.organizationId),
    index("integrations_created_at_idx").on(table.createdAt),
    // Ensure unique integration names per organization
    uniqueIndex("integrations_organization_id_name_unique_idx").on(
      table.organizationId,
      table.name
    ),
  ]
);

/**
 * RELATION DEFINITIONS
 */

export const usersRelations = relations(users, ({ many, one }) => ({
  memberships: many(memberships),
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationsRelations = relations(
  organizations,
  ({ many, one }) => ({
    memberships: many(memberships),
    workflows: many(workflows),
    deployments: many(deployments),
    apiKeys: many(apiKeys),
    datasets: many(datasets),
    queues: many(queues),
    emails: many(emails),
    secrets: many(secrets),
    integrations: many(integrations),
    users: one(users),
  })
);

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflows.organizationId],
    references: [organizations.id],
  }),
  deployments: many(deployments),
  activeDeployment: one(deployments, {
    fields: [workflows.activeDeploymentId],
    references: [deployments.id],
  }),
  cronTrigger: one(cronTriggers, {
    fields: [workflows.id],
    references: [cronTriggers.workflowId],
  }),
  queueTrigger: one(queueTriggers, {
    fields: [workflows.id],
    references: [queueTriggers.workflowId],
  }),
  emailTrigger: one(emailTriggers, {
    fields: [workflows.id],
    references: [emailTriggers.workflowId],
  }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  organization: one(organizations, {
    fields: [deployments.organizationId],
    references: [organizations.id],
  }),
  workflow: one(workflows, {
    fields: [deployments.workflowId],
    references: [workflows.id],
  }),
}));

export const cronTriggersRelations = relations(cronTriggers, ({ one }) => ({
  workflow: one(workflows, {
    fields: [cronTriggers.workflowId],
    references: [workflows.id],
  }),
}));

export const datasetsRelations = relations(datasets, ({ one }) => ({
  organization: one(organizations, {
    fields: [datasets.organizationId],
    references: [organizations.id],
  }),
}));

export const queuesRelations = relations(queues, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [queues.organizationId],
    references: [organizations.id],
  }),
  queueTriggers: many(queueTriggers),
}));

export const queueTriggersRelations = relations(queueTriggers, ({ one }) => ({
  workflow: one(workflows, {
    fields: [queueTriggers.workflowId],
    references: [workflows.id],
  }),
  queue: one(queues, {
    fields: [queueTriggers.queueId],
    references: [queues.id],
  }),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [emails.organizationId],
    references: [organizations.id],
  }),
  emailTriggers: many(emailTriggers),
}));

export const emailTriggersRelations = relations(emailTriggers, ({ one }) => ({
  workflow: one(workflows, {
    fields: [emailTriggers.workflowId],
    references: [workflows.id],
  }),
  email: one(emails, {
    fields: [emailTriggers.emailId],
    references: [emails.id],
  }),
}));

export const secretsRelations = relations(secrets, ({ one }) => ({
  organization: one(organizations, {
    fields: [secrets.organizationId],
    references: [organizations.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
}));

/**
 * HELPER FUNCTIONS
 */

// Updates the updatedAt timestamp for record modifications
export function withUpdatedTimestamp<T extends Record<string, any>>(
  data: T
): T & { updatedAt: Date } {
  return {
    ...data,
    updatedAt: new Date(),
  };
}

/**
 * TYPE EXPORTS
 */

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

export type MembershipRow = typeof memberships.$inferSelect;
export type MembershipInsert = typeof memberships.$inferInsert;

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type ApiKeyInsert = typeof apiKeys.$inferInsert;

export type WorkflowRow = typeof workflows.$inferSelect;
export type WorkflowInsert = typeof workflows.$inferInsert;

export type DeploymentRow = typeof deployments.$inferSelect;
export type DeploymentInsert = typeof deployments.$inferInsert;

export type CronTriggerRow = typeof cronTriggers.$inferSelect;
export type CronTriggerInsert = typeof cronTriggers.$inferInsert;

export type DatasetRow = typeof datasets.$inferSelect;
export type DatasetInsert = typeof datasets.$inferInsert;

export type QueueRow = typeof queues.$inferSelect;
export type QueueInsert = typeof queues.$inferInsert;

export type QueueTriggerRow = typeof queueTriggers.$inferSelect;
export type QueueTriggerInsert = typeof queueTriggers.$inferInsert;

export type EmailRow = typeof emails.$inferSelect;
export type EmailInsert = typeof emails.$inferInsert;

export type EmailTriggerRow = typeof emailTriggers.$inferSelect;
export type EmailTriggerInsert = typeof emailTriggers.$inferInsert;

export type SecretRow = typeof secrets.$inferSelect;
export type SecretInsert = typeof secrets.$inferInsert;

export type IntegrationRow = typeof integrations.$inferSelect;
export type IntegrationInsert = typeof integrations.$inferInsert;
