/**
 * Sandbox executor — runs arbitrary-language code in an isolated container.
 *
 * Host-agnostic interface; the Cloudflare implementation lives in
 * `apps/api/src/runtime/sandbox-executor.ts` and wraps `@cloudflare/sandbox`.
 *
 * Mirrors `code-mode.ts`: this file holds only the executor contract.
 * The shared node scaffolding (base class + NodeType builder) lives next
 * to the language nodes at `nodes/sandbox/base-sandbox-node.ts`.
 */

export type SandboxLanguage =
  | "python"
  | "bash"
  | "node"
  | "typescript"
  | "go"
  | "c"
  | "rust"
  | "java";

export interface SandboxFile {
  /** Path relative to the working directory. */
  path: string;
  content: string;
}

export interface SandboxOptions {
  language: SandboxLanguage;
  files?: SandboxFile[];
  args?: string[];
  stdin?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  /** Process exit code. 0 = success. */
  exitCode: number;
  /**
   * Set only when the executor itself failed (timeout, container crash,
   * unsupported language). A non-zero exitCode is NOT an executor error.
   */
  error?: string;
}

export interface SandboxExecutor {
  execute(code: string, options: SandboxOptions): Promise<SandboxResult>;
}

export const SANDBOX_UNAVAILABLE_MESSAGE =
  "Sandbox executor unavailable (SANDBOX binding missing).";
