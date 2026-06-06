import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

import {
  SANDBOX_UNAVAILABLE_MESSAGE,
  type SandboxLanguage,
} from "../../utils/sandbox-mode";

// ── Shared node metadata ──────────────────────────────────────────────────

/** Standard inputs shared by all sandbox-language nodes. */
function buildSandboxInputs(
  name: string,
  argvHelp: string
): NodeType["inputs"] {
  return [
    {
      name: "script",
      type: "string",
      description: `The ${name} script to execute`,
      required: true,
    },
    {
      name: "args",
      type: "json",
      description: `Command line arguments (array of strings) — accessible as ${argvHelp}`,
      required: false,
    },
    {
      name: "stdin",
      type: "string",
      description: "Data piped to the script's stdin",
      required: false,
    },
    {
      name: "timeout",
      type: "number",
      description: "Execution timeout in milliseconds (default: 30000)",
      required: false,
    },
  ];
}

const SANDBOX_OUTPUTS: NodeType["outputs"] = [
  { name: "stdout", type: "string", description: "Captured stdout" },
  { name: "stderr", type: "string", description: "Captured stderr" },
  { name: "exitCode", type: "number", description: "Process exit code" },
  {
    name: "error",
    type: "string",
    description: "Executor error (timeout, container crash)",
    hidden: true,
  },
];

/**
 * Build a complete NodeType from partial metadata.
 * Fills in the standard sandbox inputs/outputs and common flags.
 */
export function buildSandboxNodeType(meta: {
  id: string;
  name: string;
  description: string;
  tags: string[];
  documentation: string;
  /** How argv reaches the script in this language, e.g. "sys.argv[1:]". */
  argvHelp: string;
  /** Defaults to 50 — containers are pricier than V8 isolates. */
  usage?: number;
}): NodeType {
  return {
    id: meta.id,
    name: meta.name,
    type: meta.id,
    description: meta.description,
    tags: meta.tags,
    icon: "terminal",
    documentation: meta.documentation,
    inlinable: true,
    asTool: true,
    usage: meta.usage ?? 50,
    inputs: buildSandboxInputs(meta.name, meta.argvHelp),
    outputs: SANDBOX_OUTPUTS,
  };
}

// ── Base class ────────────────────────────────────────────────────────────

/**
 * Base class for sandbox-backed language nodes.
 *
 * Subclasses provide static `nodeType` (via `buildSandboxNodeType`) and
 * static `language`. All execution logic lives here.
 */
export abstract class BaseSandboxNode extends ExecutableNode {
  /** Subclasses must define this to select the sandbox language. */
  protected static readonly language: SandboxLanguage;

  async execute(context: NodeContext): Promise<NodeExecution> {
    const language = (this.constructor as typeof BaseSandboxNode).language;
    const { script, args = [], stdin, timeout = 30_000 } = context.inputs;

    if (!script || typeof script !== "string" || script.trim() === "") {
      return this.createErrorResult("Missing or empty script.");
    }
    if (!Array.isArray(args)) {
      return this.createErrorResult("Arguments must be an array of strings.");
    }

    const executor = context.sandboxExecutor;
    if (!executor) {
      return this.createErrorResult(SANDBOX_UNAVAILABLE_MESSAGE);
    }

    const result = await executor.execute(script, {
      language,
      args: args.map(String),
      stdin: typeof stdin === "string" ? stdin : undefined,
      timeoutMs: typeof timeout === "number" ? timeout : 30_000,
    });

    if (result.error) {
      return this.createErrorResult(`Script execution error: ${result.error}`);
    }

    return this.createSuccessResult({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      error: null,
    });
  }
}
