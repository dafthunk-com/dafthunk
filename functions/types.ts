/// <reference types="@cloudflare/workers-types" />
import { NodeRegistry } from "../src/lib/server/runtime/registries";
import { registerNodes } from "../src/lib/server/nodes/registries";
import { ApiParameterRegistry } from "../src/lib/server/api/registries";

export const onRequest: PagesFunction = async (context) => {
  try {
    // Register all node types
    registerNodes();

    // Get the registry instance with all registered node types
    const registry = NodeRegistry.getInstance();
    const apiParameterRegistry = ApiParameterRegistry.getInstance();
    const nodeTypes = apiParameterRegistry.convertNodeTypes(
      registry.getRuntimeNodeTypes()
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
