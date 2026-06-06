/**
 * In-process executor stub for unit tests.
 *
 * The real `CloudflareSandboxExecutor` spins up a container and runs
 * arbitrary-language code — neither possible nor desirable from a
 * Workers vitest pool. This stub captures the call and returns a
 * deterministic stdout describing what would have run, so tests can
 * assert on plumbing without actually executing user code.
 */

import type {
  SandboxExecutor,
  SandboxOptions,
  SandboxResult,
} from "./sandbox-mode";

export class MockSandboxExecutor implements SandboxExecutor {
  /** All `execute()` calls received, in order. Inspect from tests. */
  public readonly calls: { code: string; options: SandboxOptions }[] = [];

  async execute(code: string, options: SandboxOptions): Promise<SandboxResult> {
    this.calls.push({ code, options });
    return {
      stdout: `[mock ${options.language}] ${code}`,
      stderr: "",
      exitCode: 0,
    };
  }
}
