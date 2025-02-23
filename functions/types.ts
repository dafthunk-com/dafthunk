/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1';
import { nodeTypes as nodeTypesTable } from './db/schema';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const db = drizzle(context.env.DB);
  
  // Fetch all node types and parse JSON fields
  const types = await db.select().from(nodeTypesTable);
  const parsedTypes = types.map(type => ({
    ...type,
    inputs: JSON.parse(type.inputs as string),
    outputs: JSON.parse(type.outputs as string)
  }));
  
  return new Response(JSON.stringify(parsedTypes), {
    headers: {
      'content-type': 'application/json',
    },
  });
} 