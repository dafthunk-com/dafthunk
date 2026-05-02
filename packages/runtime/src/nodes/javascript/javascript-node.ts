import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import {
  buildScriptWithBinding,
  EXECUTOR_UNAVAILABLE_MESSAGE,
  LOG_PREFIX_ERROR,
  LOG_PREFIX_WARN,
} from "../../utils/code-mode";

export class JavascriptNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "javascript",
    name: "JavaScript",
    type: "javascript",
    description:
      "Executes JavaScript in a sandboxed V8 isolate. Inputs are bound as `args` and console output is captured to stdout/stderr.",
    tags: ["Code", "JavaScript", "Execute"],
    icon: "terminal",
    documentation:
      "Runs JavaScript in a sandboxed V8 isolate (no network, no bindings). The `args` input is bound to a local `args` array; the last expression — or an explicit `return` — becomes the result. `console.log` is captured to `stdout`; `console.warn` / `console.error` to `stderr`.",
    inlinable: true,
    asTool: true,
    usage: 10,
    inputs: [
      {
        name: "script",
        type: "string",
        description: "The JavaScript script to execute",
        required: true,
      },
      {
        name: "args",
        type: "json",
        description:
          "Command line arguments (array of strings) to pass to the script",
        required: false,
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
          "The result of the script execution (return value or last expression)",
      },
      {
        name: "stdout",
        type: "string",
        description: "Captured console.log output",
      },
      {
        name: "stderr",
        type: "string",
        description: "Captured console.error output",
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
    const { script, args = [], timeout = 5000 } = context.inputs;

    if (!script || typeof script !== "string" || script.trim() === "") {
      return this.createErrorResult("Missing or empty script.");
    }

    if (!Array.isArray(args)) {
      return this.createErrorResult("Arguments must be an array of strings.");
    }

    const executor = context.codeModeExecutor;
    if (!executor) {
      return this.createErrorResult(EXECUTOR_UNAVAILABLE_MESSAGE);
    }

    const { result, error, logs } = await executor.execute(
      buildScriptWithBinding("args", args, script),
      {},
      { timeoutMs: timeout }
    );

    const { stdout, stderr } = splitLogs(logs ?? []);

    if (error) {
      return this.createErrorResult(`Script execution error: ${error}`);
    }

    return this.createSuccessResult({
      result,
      stdout,
      stderr,
      error: null,
    });
  }
}

function splitLogs(logs: string[]): { stdout: string; stderr: string } {
  const out: string[] = [];
  const err: string[] = [];
  for (const line of logs) {
    if (line.startsWith(LOG_PREFIX_WARN)) {
      err.push(line.slice(LOG_PREFIX_WARN.length));
    } else if (line.startsWith(LOG_PREFIX_ERROR)) {
      err.push(line.slice(LOG_PREFIX_ERROR.length));
    } else {
      out.push(line);
    }
  }
  return { stdout: out.join("\n"), stderr: err.join("\n") };
}
