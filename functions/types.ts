/// <reference types="@cloudflare/workers-types" />
import { NodeRegistry } from "../src/lib/server/runtime/nodeRegistry";
import { ParameterRegistry } from "../src/lib/server/api/parameterRegistry";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * Consolidated environment interface for Cloudflare Workers
 * This interface defines all environment variables and bindings used across the application
 */
export interface Env {
  // Authentication
  JWT_SECRET: string;
  
  // Database
  DB?: D1Database;
  
  // Storage
  BUCKET?: R2Bucket;
  
  // Allow for additional environment variables
  [key: string]: any;
}

export const onRequest: PagesFunction = async (context) => {
  try {
    // Register all node types
    NodeRegistry.getInstance();

    // Get the registry instance with all registered node types
    const registry = NodeRegistry.getInstance();
    const parameterRegistry = ParameterRegistry.getInstance();
    const nodeTypes = parameterRegistry.convertNodeTypes(
      registry.getNodeTypes()
    );

    return new Response(JSON.stringify(nodeTypes), {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in types function:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
