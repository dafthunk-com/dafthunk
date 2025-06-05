import {
  Workflow as WorkflowType,
  WorkflowExecution as WorkflowExecutionType,
} from "@dafthunk/types";
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

// Workflow execution states
export const ExecutionStatus = {
  STARTED: "started",
  EXECUTING: "executing",
  COMPLETED: "completed",
  ERROR: "error",
  CANCELLED: "cancelled",
} as const;

export type ExecutionStatusType =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

// Workflow trigger types
export const WorkflowTriggerType = {
  MANUAL: "manual",
  HTTP_REQUEST: "http_request",
  EMAIL_MESSAGE: "email_message",
  CRON: "cron",
} as const;

export type WorkflowTriggerTypeType =
  (typeof WorkflowTriggerType)[keyof typeof WorkflowTriggerType];

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
    provider: text("provider").$type<ProviderType>().notNull(),
    githubId: text("github_id"),
    googleId: text("google_id"),
    avatarUrl: text("avatar_url"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    plan: text("plan").$type<PlanType>().notNull().default(Plan.TRIAL),
    role: text("role").$type<UserRoleType>().notNull().default(UserRole.USER),
    inWaitlist: integer("in_waitlist", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("users_provider_githubid_googleid_idx").on(
      table.provider,
      table.githubId,
      table.googleId
    ),
    index("users_organization_id_idx").on(table.organizationId),
    index("users_email_idx").on(table.email),
    index("users_name_idx").on(table.name),
    index("users_plan_idx").on(table.plan),
    index("users_role_idx").on(table.role),
    index("users_in_waitlist_idx").on(table.inWaitlist),
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
export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    data: text("data", { mode: "json" }).$type<WorkflowType>().notNull(),
    type: text("type")
      .$type<WorkflowTriggerTypeType>()
      .notNull()
      .default(WorkflowTriggerType.MANUAL),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("workflows_name_idx").on(table.name),
    index("workflows_type_idx").on(table.type),
    index("workflows_organization_id_idx").on(table.organizationId),
    index("workflows_created_at_idx").on(table.createdAt),
    index("workflows_updated_at_idx").on(table.updatedAt),
    uniqueIndex("workflows_organization_id_handle_unique_idx").on(
      table.organizationId,
      table.handle
    ),
  ]
);

// Deployments - Versioned workflow definitions ready for execution
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
    workflowData: text("workflow_data", { mode: "json" })
      .$type<WorkflowType>()
      .notNull(),
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

// Executions - Records of workflow runs with status and results
export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    deploymentId: text("deployment_id").references(() => deployments.id, {
      onDelete: "cascade",
    }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<ExecutionStatusType>()
      .notNull()
      .default(ExecutionStatus.STARTED),
    data: text("data", { mode: "json" })
      .$type<WorkflowExecutionType>()
      .notNull(),
    error: text("error"),
    visibility: text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("private"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
    ogImageGenerated: integer("og_image_generated", {
      mode: "boolean",
    }).default(false),
  },
  (table) => [
    index("executions_workflow_id_idx").on(table.workflowId),
    index("executions_organization_id_idx").on(table.organizationId),
    index("executions_status_idx").on(table.status),
    index("executions_deployment_id_idx").on(table.deploymentId),
    index("executions_created_at_idx").on(table.createdAt),
    index("executions_started_at_idx").on(table.startedAt),
    index("executions_ended_at_idx").on(table.endedAt),
    index("executions_visibility_idx").on(table.visibility),
    // Composite indexes for common query patterns
    index("executions_organization_id_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("executions_workflow_id_status_idx").on(
      table.workflowId,
      table.status
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
    versionAlias: text("version_alias").notNull().default("dev"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    lastRun: integer("last_run", { mode: "timestamp" }),
    nextRunAt: integer("next_run_at", { mode: "timestamp" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("cron_triggers_workflow_id_idx").on(table.workflowId),
    index("cron_triggers_version_alias_idx").on(table.versionAlias),
    index("cron_triggers_active_idx").on(table.active),
    index("cron_triggers_last_run_idx").on(table.lastRun),
    index("cron_triggers_next_run_at_idx").on(table.nextRunAt),
    index("cron_triggers_active_next_run_at_idx").on(
      table.active,
      table.nextRunAt
    ),
    index("cron_triggers_created_at_idx").on(table.createdAt),
    index("cron_triggers_updated_at_idx").on(table.updatedAt),
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
    executions: many(executions),
    deployments: many(deployments),
    apiKeys: many(apiKeys),
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
  executions: many(executions),
  deployments: many(deployments),
  cronTrigger: one(cronTriggers, {
    fields: [workflows.id],
    references: [cronTriggers.workflowId],
  }),
}));

export const executionsRelations = relations(executions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  organization: one(organizations, {
    fields: [executions.organizationId],
    references: [organizations.id],
  }),
  deployment: one(deployments, {
    fields: [executions.deploymentId],
    references: [deployments.id],
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

export type ExecutionRow = typeof executions.$inferSelect;
export type ExecutionInsert = typeof executions.$inferInsert;

export type DeploymentRow = typeof deployments.$inferSelect;
export type DeploymentInsert = typeof deployments.$inferInsert;

export type CronTriggerRow = typeof cronTriggers.$inferSelect;
export type CronTriggerInsert = typeof cronTriggers.$inferInsert;
