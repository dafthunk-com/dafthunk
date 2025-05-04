import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  Workflow as WorkflowType,
  WorkflowExecution as WorkflowExecutionType,
} from "@dafthunk/types";

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
  IDLE: "idle",
  EXECUTING: "executing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ExecutionStatusType =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

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
    plan: text("plan").$type<PlanType>().notNull().default(Plan.TRIAL),
    role: text("role").$type<UserRoleType>().notNull().default(UserRole.USER),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("users_provider_id_idx").on(
      table.provider,
      table.githubId,
      table.googleId
    ),
  ]
);

// Organizations - Collaborative workspaces for teams
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [index("organizations_name_idx").on(table.name)]
);

// Memberships - Join table for users and organizations (many-to-many)
export const memberships = sqliteTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
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
  ]
);

// API Tokens - Authentication tokens associated with organizations
export const apiTokens = sqliteTable(
  "api_tokens",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    token: text("token").notNull().unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("api_tokens_name_idx").on(table.name),
    index("api_tokens_org_id_idx").on(table.organizationId),
  ]
);

// Workflows - Workflow definitions created and edited by users
export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    data: text("data", { mode: "json" }).$type<WorkflowType>().notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("workflows_name_idx").on(table.name),
    index("workflows_org_id_idx").on(table.organizationId),
  ]
);

// Deployments - Versioned workflow definitions ready for execution
export const deployments = sqliteTable(
  "deployments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    workflowId: text("workflow_id").references(() => workflows.id),
    version: integer("version").notNull(),
    workflowData: text("workflow_data", { mode: "json" })
      .$type<WorkflowType>()
      .notNull(),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("deployments_org_id_idx").on(table.organizationId),
    index("deployments_workflow_id_idx").on(table.workflowId),
    index("deployments_version_idx").on(table.version),
  ]
);

// Executions - Records of workflow runs with status and results
export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id),
    deploymentId: text("deployment_id")
      .references(() => deployments.id),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status")
      .$type<ExecutionStatusType>()
      .notNull()
      .default(ExecutionStatus.IDLE),
    data: text("data", { mode: "json" })
      .$type<WorkflowExecutionType>()
      .notNull(),
    error: text("error"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    createdAt: createCreatedAt(),
    updatedAt: createUpdatedAt(),
  },
  (table) => [
    index("executions_workflow_id_idx").on(table.workflowId),
    index("executions_org_id_idx").on(table.organizationId),
    index("executions_status_idx").on(table.status),
    index("executions_deployment_id_idx").on(table.deploymentId),
  ]
);

/**
 * RELATION DEFINITIONS
 */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  workflows: many(workflows),
  executions: many(executions),
  deployments: many(deployments),
  apiTokens: many(apiTokens),
}));

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

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiTokens.organizationId],
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

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
