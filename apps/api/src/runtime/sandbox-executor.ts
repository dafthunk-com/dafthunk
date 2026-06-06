/**
 * Cloudflare-specific Sandbox executor.
 *
 * Wraps `@cloudflare/sandbox` so runtime nodes can run code in arbitrary
 * languages without coupling the runtime package to Cloudflare. One sandbox
 * per execution: reused across nodes within the same workflow run, isolated
 * across runs. Sandbox sleeps after 10 min of inactivity (SDK default).
 *
 * Compiled languages (C, Rust, Go) follow a compile-then-run pattern. Real
 * production use should cache the binary by `hash(source)` to avoid paying
 * rustc/gcc startup on every invocation — out of scope for this sketch.
 */

import { getSandbox } from "@cloudflare/sandbox";

import {
  type SandboxExecutor,
  type SandboxLanguage,
  type SandboxOptions,
  type SandboxResult,
} from "@dafthunk/runtime/utils/sandbox-mode";

import type { Bindings } from "../context";

interface LanguageSpec {
  /** Filename under the workdir for the user source. */
  sourceFile: string;
  /** Shell command(s) to run after staging files. `$ARGS` is replaced with quoted argv. */
  command: (workdir: string) => string;
}

const LANGUAGES: Record<SandboxLanguage, LanguageSpec> = {
  python: {
    sourceFile: "main.py",
    command: (w) => `cd ${w} && python3 main.py $ARGS`,
  },
  bash: {
    sourceFile: "main.sh",
    command: (w) => `cd ${w} && bash main.sh $ARGS`,
  },
  node: {
    sourceFile: "main.mjs",
    command: (w) => `cd ${w} && node main.mjs $ARGS`,
  },
  typescript: {
    sourceFile: "main.ts",
    command: (w) => `cd ${w} && tsx main.ts $ARGS`,
  },
  go: {
    sourceFile: "main.go",
    command: (w) => `cd ${w} && go run main.go $ARGS`,
  },
  c: {
    sourceFile: "main.c",
    command: (w) => `cd ${w} && gcc -O2 main.c -o main.out && ./main.out $ARGS`,
  },
  rust: {
    sourceFile: "main.rs",
    command: (w) =>
      `cd ${w} && rustc -O main.rs -o main.out && ./main.out $ARGS`,
  },
  java: {
    // Single-file source-launch (JDK 11+): no separate javac step needed.
    // Class name must match the filename → user code declares `public class Main`.
    sourceFile: "Main.java",
    command: (w) => `cd ${w} && java Main.java $ARGS`,
  },
};

function quoteArgs(args: string[]): string {
  return args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
}

class CloudflareSandboxExecutor implements SandboxExecutor {
  #sandbox: ReturnType<typeof getSandbox>;
  #defaultTimeout: number;
  #counter = 0;

  constructor(sandbox: ReturnType<typeof getSandbox>, defaultTimeout = 30_000) {
    this.#sandbox = sandbox;
    this.#defaultTimeout = defaultTimeout;
  }

  async execute(code: string, options: SandboxOptions): Promise<SandboxResult> {
    const spec = LANGUAGES[options.language];
    if (!spec) {
      return {
        stdout: "",
        stderr: "",
        exitCode: -1,
        error: `Unsupported language: ${options.language}`,
      };
    }

    // Fresh workdir per call → isolation between nodes in the same workflow.
    const workdir = `/workspace/run-${++this.#counter}-${Date.now()}`;
    const timeoutMs = options.timeoutMs ?? this.#defaultTimeout;

    try {
      await this.#sandbox.mkdir(workdir, { recursive: true });
      await this.#sandbox.writeFile(`${workdir}/${spec.sourceFile}`, code);

      for (const f of options.files ?? []) {
        await this.#sandbox.writeFile(`${workdir}/${f.path}`, f.content);
      }

      const argv = quoteArgs(options.args ?? []);
      let command = spec.command(workdir).replace("$ARGS", argv);

      // Cloudflare's exec() has no stdin option — stage it as a file and
      // redirect on the shell invocation.
      if (options.stdin !== undefined) {
        await this.#sandbox.writeFile(`${workdir}/.stdin`, options.stdin);
        command = `${command} < ${workdir}/.stdin`;
      }

      const result = await this.#sandbox.exec(command, {
        env: options.env,
        timeout: timeoutMs,
      });

      return {
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        exitCode: result.exitCode ?? 0,
      };
    } catch (err) {
      return {
        stdout: "",
        stderr: "",
        exitCode: -1,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export function createSandboxExecutor(
  env: Bindings,
  sandboxId: string
): SandboxExecutor | null {
  if (!env.SANDBOX) return null;
  const sandbox = getSandbox(env.SANDBOX, sandboxId);
  return new CloudflareSandboxExecutor(sandbox);
}
