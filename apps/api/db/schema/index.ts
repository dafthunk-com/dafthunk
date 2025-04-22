import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// Define plans
export const Plan = {
  TRIAL: "trial",
  FREE: "free",
  PRO: "pro",
} as const;

export type PlanType = (typeof Plan)[keyof typeof Plan];

// Define roles
export const Role = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

// Define providers
export const Provider = {
  GITHUB: "github",
  GOOGLE: "google",
  // Add more providers as needed
} as const;

export type ProviderType = (typeof Provider)[keyof typeof Provider];

// Define execution status types
export const ExecutionStatus = {
  IDLE: "idle",
  EXECUTING: "executing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ExecutionStatusType = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  email: text("email").unique(), // Unique constraint on email
  provider: text("provider").$type<ProviderType>().notNull(),
  // Provider-specific IDs
  githubId: text("github_id"),
  googleId: text("google_id"),
  // Add more provider IDs as needed
  avatarUrl: text("avatar_url"),
  plan: text("plan").$type<PlanType>().notNull().default(Plan.TRIAL),
  role: text("role").$type<RoleType>().notNull().default(Role.USER),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: text("data", { mode: "json" }).notNull(), // This will store nodes and edges
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const executions = sqliteTable("executions", {
  id: text("id").primaryKey(), // Execution instance ID
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").$type<ExecutionStatusType>().notNull().default(ExecutionStatus.IDLE),
  data: text("data", { mode: "json" }).notNull(), // Stores the execution data including node statuses
  error: text("error"), // Optional error message
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Relations definitions after all tables are defined
export const usersRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
  executions: many(executions),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  executions: many(executions),
}));

export const executionsRelations = relations(executions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
  user: one(users, {
    fields: [executions.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;
