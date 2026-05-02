/**
 * Code Mode utilities for multi-tool orchestration.
 *
 * Wraps multiple ToolDefinitions into a single "codemode" tool that lets
 * the LLM generate JavaScript code calling several tools in one step,
 * executed in a sandboxed V8 isolate.
 *
 * No external dependencies — the Executor is injected at call-site.
 */

import type { JSONSchema, ToolDefinition } from "../tool-types";

// ── Executor interface (mirrors @cloudflare/codemode Executor shape) ────

export interface CodeModeResult {
  result: unknown;
  error?: string;
  logs?: string[];
}

export interface CodeModeOptions {
  /** Per-call execution timeout in milliseconds. Falls back to executor default. */
  timeoutMs?: number;
}

export interface CodeModeExecutor {
  execute(
    code: string,
    fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
    options?: CodeModeOptions
  ): Promise<CodeModeResult>;
}

// ── Console-capture log-line prefix convention ──────────────────────────
// The wrapper module in `apps/api/src/runtime/code-mode-executor.ts` and the
// `MockCodeModeExecutor` route console.warn / console.error through these
// prefixes so a single `logs[]` array can carry both streams over RPC.

export const LOG_PREFIX_WARN = "[warn] ";
export const LOG_PREFIX_ERROR = "[error] ";

// ── Shared error message for nodes when LOADER is unavailable ───────────

export const EXECUTOR_UNAVAILABLE_MESSAGE =
  "JavaScript executor unavailable (LOADER binding missing).";

// ── Source transformation: last-expression → return ─────────────────────

/**
 * Auto-`return` the trailing expression when the user hasn't written one.
 *
 * `CodeModeExecutor` runs user code as the body of an async function — only
 * `return` surfaces a value. Workflow scripts conventionally rely on
 * last-expression semantics, so this bridges the two with a heuristic:
 * any `\breturn\b` in the source disables the rewrite.
 */
export function autoReturnLastExpression(code: string): string {
  const stripped = code.replace(/;\s*$/, "").trimEnd();
  const trimmed = stripped.trim();
  if (trimmed === "") return code;

  // Defer to explicit user flow if `return` appears anywhere (false positives
  // in string literals are acceptable — they can wrap with `return (...)`).
  if (/\breturn\b/.test(trimmed)) return code;

  // Object-literal-only script: wrap in parens so it parses as expression.
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return `return (${trimmed});`;
  }

  if (!stripped.includes(";") && !/[\n\r]/.test(stripped)) {
    return `return (${trimmed});`;
  }

  // Multi-statement: split on the final `;` and return the trailing tail.
  // Heuristic — won't handle `;` embedded in strings/templates.
  const lastSemi = stripped.lastIndexOf(";");
  if (lastSemi === -1) return `return (${trimmed});`;

  const before = stripped.slice(0, lastSemi + 1);
  const tail = stripped.slice(lastSemi + 1).trim();
  if (tail === "") return before;
  return `${before}\nreturn (${tail});`;
}

// ── Bind a host value into the user script's lexical scope ──────────────

/**
 * Build executor-ready code that binds `value` to `bindingName` in the user
 * script's scope, then auto-returns the trailing expression. Used by the
 * `args` (script node) and `json` (json-execute node) bindings.
 */
export function buildScriptWithBinding(
  bindingName: string,
  value: unknown,
  userScript: string
): string {
  return `const ${bindingName} = ${JSON.stringify(value)};\n${autoReturnLastExpression(userScript)}`;
}

// ── JSON Schema → TypeScript type string ────────────────────────────────

/**
 * Convert a JSON Schema to a TypeScript type string.
 * Handles objects, arrays, primitives, enums, and required fields.
 */
export function jsonSchemaToTypeString(schema: JSONSchema): string {
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";

    case "array": {
      const itemType = schema.items
        ? jsonSchemaToTypeString(schema.items)
        : "unknown";
      return `${itemType}[]`;
    }

    case "object": {
      if (!schema.properties) return "Record<string, unknown>";
      const required = new Set(schema.required ?? []);
      const fields = Object.entries(schema.properties).map(([key, prop]) => {
        const optional = required.has(key) ? "" : "?";
        return `  ${key}${optional}: ${jsonSchemaToTypeString(prop)}`;
      });
      return `{\n${fields.join(";\n")};\n}`;
    }

    default:
      return "unknown";
  }
}

// ── Tool name sanitisation ──────────────────────────────────────────────

/**
 * Make a tool name a valid JavaScript identifier.
 * Replaces non-alphanumeric characters with underscores and
 * prefixes with `_` if it starts with a digit.
 */
export function sanitizeName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(sanitized) ? `_${sanitized}` : sanitized;
}

// ── Type declaration generation ─────────────────────────────────────────

/**
 * Build TypeScript type declarations for all wrapped tools as methods
 * on the `codemode` namespace — matching how they're accessed in the sandbox.
 *
 * Produces a string like:
 *
 *   declare const codemode: {
 *     /** description *\/
 *     tool_name(params: { ... }): Promise<string>;
 *   };
 */
export function generateToolTypeDeclarations(tools: ToolDefinition[]): string {
  const methods = tools
    .map((tool) => {
      const name = sanitizeName(tool.name);
      const paramType = jsonSchemaToTypeString(tool.parameters);
      const desc = tool.description ? `  /** ${tool.description} */\n` : "";
      return `${desc}  ${name}(params: ${paramType}): Promise<string>;`;
    })
    .join("\n");

  return `declare const codemode: {\n${methods}\n};`;
}

// ── Code Mode tool wrapper ──────────────────────────────────────────────

/**
 * Wrap multiple ToolDefinitions into a single "codemode" ToolDefinition.
 *
 * The returned tool:
 * - name: "codemode"
 * - parameters: `{ code: string }`
 * - description: includes generated TypeScript declarations
 * - function: executes the code in the provided executor sandbox
 */
export function createCodeModeToolDefinition(
  tools: ToolDefinition[],
  executor: CodeModeExecutor
): ToolDefinition {
  const typeDeclarations = generateToolTypeDeclarations(tools);

  // Build function map: sanitized name → tool.function
  const functionMap: Record<string, (...args: unknown[]) => Promise<unknown>> =
    {};
  for (const tool of tools) {
    const name = sanitizeName(tool.name);
    functionMap[name] = async (...args: unknown[]) => {
      const params = (args[0] ?? {}) as Record<string, unknown>;
      return tool.function(params);
    };
  }

  return {
    name: "codemode",
    description: [
      "Execute JavaScript code that orchestrates multiple tools in a single step.",
      "Write sequential JavaScript statements using `await` and `codemode.<tool>(params)`.",
      "Use `return` to produce the final result. Example:",
      "",
      "```",
      'const a = await codemode.tool_a({ input: "hello" });',
      "const b = await codemode.tool_b({ data: a });",
      "return b;",
      "```",
      "",
      "Available tools on the `codemode` object:\n",
      typeDeclarations,
    ].join("\n"),
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "Sequential JavaScript statements using await and codemode.<tool>(params). Use return for the final result. Do NOT wrap in async function.",
        },
      },
      required: ["code"],
    },
    function: async (args: Record<string, unknown>) => {
      const code = args.code as string;
      if (!code) return JSON.stringify({ error: "No code provided" });

      try {
        const result = await executor.execute(code, functionMap);
        if (result.error) {
          return JSON.stringify({ error: result.error, logs: result.logs });
        }
        return JSON.stringify({ result: result.result, logs: result.logs });
      } catch (error) {
        return JSON.stringify({
          error:
            error instanceof Error ? error.message : "Code execution failed",
        });
      }
    },
  };
}
