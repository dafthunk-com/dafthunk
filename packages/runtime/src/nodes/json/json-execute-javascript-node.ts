import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import {
  buildScriptWithBinding,
  EXECUTOR_UNAVAILABLE_MESSAGE,
} from "../../utils/code-mode";

export class JsonExecuteJavascriptNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-execute-javascript",
    name: "JSON Execute Javascript",
    type: "json-execute-javascript",
    description:
      "Executes a JavaScript script with a JSON object as input. The input JSON is available as a global variable 'json'. The result of the last expression is returned.",
    tags: ["Data", "JSON", "Execute", "JavaScript"],
    icon: "code",
    documentation:
      "This node executes JavaScript code with a JSON object as input, allowing you to transform and manipulate JSON data programmatically.",
    inlinable: true,
    asTool: true,
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The JSON object to process",
        required: true,
      },
      {
        name: "javascript",
        type: "string",
        description:
          "JavaScript code to execute. 'json' is available globally. The last expression's result is returned.",
        required: true,
      },
      {
        name: "timeout",
        type: "number",
        description: "Execution timeout in milliseconds (default: 5000)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "result",
        type: "json",
        description:
          "The result of the script execution, expected to be a JSON object or array",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if script execution failed",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { json, javascript, timeout = 5000 } = context.inputs;

    if (json === undefined || json === null) {
      return this.createErrorResult("Missing JSON input object.");
    }

    if (
      !javascript ||
      typeof javascript !== "string" ||
      javascript.trim() === ""
    ) {
      return this.createErrorResult("Missing or empty script.");
    }

    const executor = context.codeModeExecutor;
    if (!executor) {
      return this.createErrorResult(EXECUTOR_UNAVAILABLE_MESSAGE);
    }

    const { result, error } = await executor.execute(
      buildScriptWithBinding("json", json, javascript),
      {},
      { timeoutMs: timeout }
    );

    if (error) {
      return this.createErrorResult(`Script execution error: ${error}`);
    }

    return this.createSuccessResult({
      result,
      error: null,
    });
  }
}
