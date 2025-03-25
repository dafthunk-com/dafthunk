import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Monaco Editor node implementation
 * This node provides a Monaco Editor widget that outputs the entered code value.
 *
 * The editor's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class MonacoEditorNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "monaco-editor",
    name: "Code Editor",
    type: "monaco-editor",
    description: "A Monaco Editor widget for editing code with syntax highlighting",
    category: "Widgets",
    icon: "code",
    inputs: [
      {
        name: "value",
        type: "string",
        description: "Current code value in the editor",
        hidden: true,
        value: "" // Default empty string
      },
      {
        name: "language",
        type: "string",
        description: "Programming language for syntax highlighting",
        hidden: true,
        value: "javascript" // Default to JavaScript
      },
      {
        name: "theme",
        type: "string",
        description: "Editor theme (e.g., 'vs', 'vs-dark')",
        hidden: true,
        value: "vs" // Default to light theme
      },
      {
        name: "minimap",
        type: "boolean",
        description: "Whether to show the minimap",
        hidden: true,
        value: false // Default to no minimap
      },
      {
        name: "lineNumbers",
        type: "boolean",
        description: "Whether to show line numbers",
        hidden: true,
        value: false // Default to hide line numbers
      },
      {
        name: "fontSize",
        type: "number",
        description: "Editor font size",
        hidden: true,
        value: 12 // Default font size
      }
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description: "The current code value from the editor",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = context.inputs.value as string;
      const language = context.inputs.language as string;
      const theme = context.inputs.theme as string;
      const minimap = context.inputs.minimap as boolean;
      const lineNumbers = context.inputs.lineNumbers as boolean;
      const fontSize = context.inputs.fontSize as number;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (typeof language !== "string") {
        return this.createErrorResult("Language must be a string");
      }

      if (typeof theme !== "string") {
        return this.createErrorResult("Theme must be a string");
      }

      if (typeof minimap !== "boolean") {
        return this.createErrorResult("Minimap must be a boolean");
      }

      if (typeof lineNumbers !== "boolean") {
        return this.createErrorResult("Line numbers must be a boolean");
      }

      if (typeof fontSize !== "number" || fontSize < 1) {
        return this.createErrorResult("Font size must be a positive number");
      }

      return this.createSuccessResult({
        value: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 