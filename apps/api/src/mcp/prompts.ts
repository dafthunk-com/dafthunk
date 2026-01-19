import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Register MCP prompts (reusable prompt templates)
 */
export function registerPrompts(server: McpServer): void {
  // workflow-builder prompt - Step-by-step guide for building workflows
  server.registerPrompt(
    "workflow-builder",
    {
      description: "Step-by-step guide for building workflows in Dafthunk",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `# Workflow Builder Guide

You are helping the user build a workflow in Dafthunk, a visual workflow automation platform.

## Available Tools

### Node Discovery
- \`list_node_categories\` - See all categories (AI, Image, Text, etc.)
- \`search_nodes\` - Find nodes by name/description/category
- \`get_node_schema\` - Get full input/output schema for a node type

### Workflow Management
- \`create_workflow\` - Create a new workflow
- \`get_workflow\` - Get workflow details
- \`list_workflows\` - List all workflows
- \`delete_workflow\` - Delete a workflow
- \`validate_workflow\` - Check for errors

### Workflow Building
- \`add_node\` - Add a node to the workflow
- \`connect_nodes\` - Connect node output to input
- \`remove_node\` - Remove a node
- \`update_node\` - Update node inputs/position

### Execution
- \`execute_workflow\` - Run in dev mode
- \`execute_workflow_prod\` - Run in production mode
- \`get_execution_status\` - Check execution progress
- \`list_executions\` - List recent executions

## Workflow Building Steps

1. **Understand Requirements**
   - What should the workflow accomplish?
   - What trigger type? (manual, http_request, scheduled, etc.)
   - What inputs/outputs are needed?

2. **Find Nodes**
   - Use \`list_node_categories\` to see available categories
   - Use \`search_nodes\` to find specific functionality
   - Use \`get_node_schema\` to understand node inputs/outputs

3. **Create Workflow**
   - Call \`create_workflow\` with name, trigger type, and description

4. **Add Nodes**
   - Add nodes one at a time with \`add_node\`
   - Set input values for static configuration
   - Note the returned nodeId for each node

5. **Connect Nodes**
   - Wire outputs to inputs with \`connect_nodes\`
   - Match data types (string to string, image to image, etc.)

6. **Validate**
   - Call \`validate_workflow\` to check for errors
   - Fix any issues before execution

7. **Test**
   - Use \`execute_workflow\` to test in dev mode
   - Check results with \`get_execution_status\`

## Common Patterns

### AI Text Processing
1. Text Input node -> Claude/GPT node -> Text Output node

### Image Generation
1. Text Input (prompt) -> Stable Diffusion/DALL-E node -> Image Output node

### Data Pipeline
1. HTTP Request node -> JSON Extract node -> Process -> HTTP Response node

### Scheduled Task
1. Scheduled Trigger -> Your Logic -> Send Email/Webhook

## Tips
- Always get the node schema before adding a node
- Position nodes left-to-right for data flow
- Use descriptive node names
- Validate before executing
- Check execution status for errors

What kind of workflow would you like to build?`,
            },
          },
        ],
      };
    }
  );
}
