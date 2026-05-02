/**
 * In-process executor for unit tests, mirroring DynamicWorkerExecutor's
 * surface (async-function-body semantics, console capture, timeout) without
 * the Cloudflare WorkerLoader binding.
 */

import {
  type CodeModeExecutor,
  type CodeModeOptions,
  type CodeModeResult,
  LOG_PREFIX_ERROR,
  LOG_PREFIX_WARN,
} from "./code-mode";

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...callArgs: unknown[]) => Promise<unknown>;

export class MockCodeModeExecutor implements CodeModeExecutor {
  #defaultTimeout: number;

  constructor(defaultTimeout = 30_000) {
    this.#defaultTimeout = defaultTimeout;
  }

  async execute(
    code: string,
    fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
    options?: CodeModeOptions
  ): Promise<CodeModeResult> {
    const timeoutMs = options?.timeoutMs ?? this.#defaultTimeout;
    const logs: string[] = [];

    const fakeConsole = {
      log: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
      warn: (...a: unknown[]) =>
        logs.push(LOG_PREFIX_WARN + a.map(String).join(" ")),
      error: (...a: unknown[]) =>
        logs.push(LOG_PREFIX_ERROR + a.map(String).join(" ")),
    };

    const codemode = new Proxy(
      {} as Record<string, (args?: unknown) => Promise<unknown>>,
      {
        get: (_, name: string) => async (args?: unknown) => {
          const fn = fns[name];
          if (!fn) throw new Error(`Tool "${name}" not found`);
          return fn(args ?? {});
        },
      }
    );

    let runner: (codemode: unknown, console: unknown) => Promise<unknown>;
    try {
      runner = new AsyncFunction("codemode", "console", code) as typeof runner;
    } catch (err) {
      return {
        result: undefined,
        error: err instanceof Error ? err.message : String(err),
        logs,
      };
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        runner(codemode, fakeConsole),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("Execution timed out")),
            timeoutMs
          );
        }),
      ]);
      return { result, logs };
    } catch (err) {
      return {
        result: undefined,
        error: err instanceof Error ? err.message : String(err),
        logs,
      };
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
