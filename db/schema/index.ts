import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const nodeTypes = sqliteTable('node_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  icon: text('icon').notNull(),
  inputs: text('inputs', { mode: 'json' }).notNull(),
  outputs: text('outputs', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  data: text('data', { mode: 'json' }).notNull(), // This will store nodes and edges
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type NodeType = typeof nodeTypes.$inferSelect;
export type NewNodeType = typeof nodeTypes.$inferInsert;

export type Graph = typeof workflows.$inferSelect;
export type NewGraph = typeof workflows.$inferInsert; 