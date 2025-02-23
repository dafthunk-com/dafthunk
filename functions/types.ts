/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1';
import { nodeTypes as nodeTypesTable } from './db/schema';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    // Check if DB binding exists
    if (!context.env.DB) {
      throw new Error('Database binding not found');
    }

    try {
      // Try using drizzle first
      const db = drizzle(context.env.DB);
      const types = await db.select().from(nodeTypesTable);
      console.log('Drizzle query successful:', types);
      
      const parsedTypes = types.map(type => ({
        ...type,
        inputs: JSON.parse(type.inputs as string),
        outputs: JSON.parse(type.outputs as string)
      }));
      
      return new Response(JSON.stringify(parsedTypes), {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (drizzleError) {
      console.error('Drizzle query failed:', drizzleError);
      
      // Fallback to raw D1 query
      const { results } = await context.env.DB.prepare(
        'SELECT * FROM node_types'
      ).all();
      
      console.log('Raw D1 query successful:', results);
      
      const parsedTypes = results.map((type: any) => ({
        ...type,
        inputs: JSON.parse(type.inputs as string),
        outputs: JSON.parse(type.outputs as string)
      }));
      
      return new Response(JSON.stringify(parsedTypes), {
        headers: {
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    console.error('Error in types function:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
    }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
} 