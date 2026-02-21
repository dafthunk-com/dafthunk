/**
 * Cloudflare-specific Code Mode executor.
 *
 * Executes LLM-generated JavaScript in an isolated Cloudflare Worker via
 * the WorkerLoader binding. Tool calls from the sandbox are dispatched back
 * to the host via Workers RPC (ToolDispatcher → RpcTarget).
 *
 * Implements the CodeModeExecutor interface from @dafthunk/runtime so the
 * runtime package stays dependency-free.
 *
 * Returns null from the factory when the LOADER binding is unavailable
 * (graceful fallback to standard tool calling).
 */

import { RpcTarget } from "cloudflare:workers";

import type {
  CodeModeExecutor,
  CodeModeResult,
} from "@dafthunk/runtime/utils/code-mode";

import type { Bindings } from "../context";

// ── RPC target for tool calls from sandbox → host ───────────────────────

class ToolDispatcher extends RpcTarget {
  #fns: Record<string, (...args: unknown[]) => Promise<unknown>>;

  constructor(fns: Record<string, (...args: unknown[]) => Promise<unknown>>) {
    super();
    this.#fns = fns;
  }

  async call(name: string, argsJson: string): Promise<string> {
    const fn = this.#fns[name];
    if (!fn) return JSON.stringify({ error: `Tool "${name}" not found` });
    try {
      const result = await fn(argsJson ? JSON.parse(argsJson) : {});
      return JSON.stringify({ result });
    } catch (err) {
      return JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ── Dynamic Worker executor ─────────────────────────────────────────────

class DynamicWorkerExecutor implements CodeModeExecutor {
  #loader: WorkerLoader;
  #timeout: number;

  constructor(loader: WorkerLoader, timeout = 30_000) {
    this.#loader = loader;
    this.#timeout = timeout;
  }

  async execute(
    code: string,
    fns: Record<string, (...args: unknown[]) => Promise<unknown>>
  ): Promise<CodeModeResult> {
    const timeoutMs = this.#timeout;

    // Build a self-contained ES module that wraps the LLM-generated code.
    // The code is wrapped in `(async () => { CODE })()` so the LLM can
    // write plain sequential statements with `await` and `return`.
    const moduleSource = [
      'import { WorkerEntrypoint } from "cloudflare:workers";',
      "",
      "export default class CodeExecutor extends WorkerEntrypoint {",
      "  async evaluate(dispatcher) {",
      "    const __logs = [];",
      '    console.log = (...a) => { __logs.push(a.map(String).join(" ")); };',
      '    console.warn = (...a) => { __logs.push("[warn] " + a.map(String).join(" ")); };',
      '    console.error = (...a) => { __logs.push("[error] " + a.map(String).join(" ")); };',
      "    const codemode = new Proxy({}, {",
      "      get: (_, toolName) => async (args) => {",
      "        const resJson = await dispatcher.call(String(toolName), JSON.stringify(args ?? {}));",
      "        const data = JSON.parse(resJson);",
      '        if (data.error) throw new Error(data.error);',
      "        return data.result;",
      "      }",
      "    });",
      "",
      "    try {",
      "      const result = await Promise.race([",
      "        (async () => {", // ← wrap LLM code in async IIFE
      code,
      "        })()",
      ",",
      "        new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timed out')), " +
        timeoutMs +
        "))",
      "      ]);",
      "      return { result, logs: __logs };",
      "    } catch (err) {",
      "      return { result: undefined, error: err.message, logs: __logs };",
      "    }",
      "  }",
      "}",
    ].join("\n");

    const dispatcher = new ToolDispatcher(fns);

    const worker = this.#loader.get(
      `codemode-${crypto.randomUUID()}`,
      () => ({
        compatibilityDate: "2025-06-01",
        compatibilityFlags: ["nodejs_compat"],
        mainModule: "executor.js",
        modules: { "executor.js": moduleSource },
        globalOutbound: null, // block outbound fetch/connect
      })
    );

    const entrypoint = worker.getEntrypoint() as unknown as {
      evaluate(
        dispatcher: ToolDispatcher
      ): Promise<{
        result: unknown;
        error?: string;
        logs?: string[];
      }>;
    };

    const response = await entrypoint.evaluate(dispatcher);

    return {
      result: response.result,
      error: response.error,
      logs: response.logs,
    };
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

export function createCodeModeExecutor(
  env: Bindings
): CodeModeExecutor | null {
  if (!env.LOADER) return null;
  return new DynamicWorkerExecutor(env.LOADER);
}
