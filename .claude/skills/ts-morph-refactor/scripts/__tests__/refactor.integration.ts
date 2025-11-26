import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SKILL_DIR = path.resolve(__dirname, "../..");
const FIXTURES_DIR = path.join(SKILL_DIR, "test-fixtures");
const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");

let tempDir: string;

function copyFixtures(): string {
  const testName = expect.getState().currentTestName?.replace(/\s+/g, "-") || "test";
  const dest = path.join(SKILL_DIR, ".test-temp", testName);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }
  fs.cpSync(FIXTURES_DIR, dest, { recursive: true });
  return dest;
}

function runScript(script: string, args: string[]): { success: boolean; output: string } {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  const tsconfigPath = path.join(tempDir, "tsconfig.json");

  // Convert relative paths to absolute
  const resolvedArgs = args.map((arg) => {
    if (arg.startsWith("src/") || (arg.endsWith(".ts") && !arg.startsWith("/"))) {
      return path.join(tempDir, arg);
    }
    return arg;
  });

  const fullArgs = [tsconfigPath, ...resolvedArgs];

  try {
    // Run from skill directory using its own node_modules
    const output = execSync(`npx tsx ${scriptPath} ${fullArgs.map((a) => `"${a}"`).join(" ")}`, {
      cwd: SKILL_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    return {
      success: false,
      output: err.stdout || err.stderr || err.message,
    };
  }
}

function typecheck(): { success: boolean; output: string } {
  try {
    const tsconfigPath = path.join(tempDir, "tsconfig.json");
    const output = execSync(`npx tsc --noEmit -p "${tsconfigPath}"`, {
      cwd: SKILL_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return { success: false, output: err.stdout || err.stderr || "" };
  }
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(tempDir, relativePath), "utf-8");
}

beforeEach(() => {
  tempDir = copyFixtures();
});

afterEach(() => {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
});

describe("rename-symbol.ts", () => {
  it("renames a class across all files", () => {
    const result = runScript("rename-symbol.ts", ["src/base.ts", "class", "ExecutableNode", "BaseNode"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("export abstract class BaseNode");
    expect(base).not.toContain("class ExecutableNode");

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("extends BaseNode");
    expect(implA).not.toContain("extends ExecutableNode");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("extends BaseNode");
    expect(implB).toContain("extends NumberNode"); // Inheritance chain preserved

    expect(typecheck().success).toBe(true);
  });

  it("renames an interface across all files", () => {
    const result = runScript("rename-symbol.ts", ["src/base.ts", "interface", "Handler", "RequestHandler"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("export interface RequestHandler");
    expect(base).not.toContain("interface Handler {");

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("implements RequestHandler");

    const consumer = readFile("src/consumer.ts");
    expect(consumer).toContain("RequestHandler[]");

    expect(typecheck().success).toBe(true);
  });

  it("renames a function across all files", () => {
    const result = runScript("rename-symbol.ts", ["src/base.ts", "function", "formatDate", "formatTimestamp"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("export function formatTimestamp");
    expect(base).not.toContain("function formatDate");

    const consumer = readFile("src/consumer.ts");
    expect(consumer).toContain("formatTimestamp");
    expect(consumer).not.toContain("formatDate");

    expect(typecheck().success).toBe(true);
  });

  it("renames a type alias across all files", () => {
    const result = runScript("rename-symbol.ts", ["src/base.ts", "type", "Result", "OperationResult"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("export type OperationResult<T>");
    expect(base).not.toContain("type Result<T> =");

    const utils = readFile("src/utils.ts");
    expect(utils).toContain("OperationResult<T>");
    expect(utils).toContain("OperationResult<string>");

    expect(typecheck().success).toBe(true);
  });
});

describe("move-declaration.ts", () => {
  it("moves a function to another file and updates imports", () => {
    const result = runScript("move-declaration.ts", [
      "src/impl-a.ts",
      "src/utils.ts",
      "function",
      "processText",
    ]);
    expect(result.success).toBe(true);

    const utils = readFile("src/utils.ts");
    expect(utils).toContain("export function processText");

    const implA = readFile("src/impl-a.ts");
    expect(implA).not.toContain("export function processText");

    // Consumer should still work (imports updated)
    const consumer = readFile("src/consumer.ts");
    expect(consumer).toContain("processText");

    expect(typecheck().success).toBe(true);
  });
});

describe("rename-parameter.ts", () => {
  it("renames parameter in all ExecutableNode subclasses", () => {
    const result = runScript("rename-parameter.ts", ["execute", "ctx", "context", "--class=ExecutableNode"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("execute(context: Context)");
    expect(base).not.toContain("execute(ctx: Context)");

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("execute(context: Context)");
    expect(implA).toContain("context.timestamp");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("execute(context: Context)");
    // DataHandler.handle still has ctx (it's a Handler, not ExecutableNode)
    expect(implB).toContain("handle(request: Request, ctx: Context)");

    expect(typecheck().success).toBe(true);
  });

  it("renames parameter in interface and all implementations", () => {
    const result = runScript("rename-parameter.ts", ["handle", "ctx", "context", "--interface=Handler"]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("handle(request: Request, context: Context)");

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("handle(request: Request, context: Context)");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("handle(request: Request, context: Context)");
    expect(implB).toContain("context.userId");

    expect(typecheck().success).toBe(true);
  });
});

describe("set-return-type.ts", () => {
  it("sets return type on all matching methods", () => {
    const result = runScript("set-return-type.ts", ["execute", "Promise<Response>", "--class=ExecutableNode"]);
    expect(result.success).toBe(true);

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("execute(ctx: Context): Promise<Response>");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("execute(ctx: Context): Promise<Response>");

    expect(typecheck().success).toBe(true);
  });
});

describe("add-method-to-implementations.ts", () => {
  it("adds method to all subclasses", () => {
    const result = runScript("add-method-to-implementations.ts", ["ExecutableNode", "validate", "boolean"]);
    expect(result.success).toBe(true);

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("validate(): boolean");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("validate(): boolean");

    expect(typecheck().success).toBe(true);
  });

  it("adds async method with parameters", () => {
    const result = runScript("add-method-to-implementations.ts", [
      "ExecutableNode",
      "cleanup",
      "Promise<void>",
      "force:boolean",
      "--async",
    ]);
    expect(result.success).toBe(true);

    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("async cleanup(force: boolean): Promise<void>");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("async cleanup(force: boolean): Promise<void>");

    expect(typecheck().success).toBe(true);
  });
});

describe("propagate-interface.ts", () => {
  it("propagates interface to all implementations", () => {
    const result = runScript("propagate-interface.ts", ["Handler"]);
    expect(result.success).toBe(true);

    // Handler implementations should still exist
    const implA = readFile("src/impl-a.ts");
    expect(implA).toContain("UserHandler implements Handler");

    const implB = readFile("src/impl-b.ts");
    expect(implB).toContain("DataHandler implements Handler");

    expect(typecheck().success).toBe(true);
  });
});

describe("add-interface-property.ts", () => {
  it("adds optional property to interface", () => {
    const result = runScript("add-interface-property.ts", [
      "src/base.ts",
      "Context",
      "debug",
      "boolean",
      "--optional",
    ]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("debug?: boolean");

    expect(typecheck().success).toBe(true);
  });

  it("adds readonly property to interface", () => {
    const result = runScript("add-interface-property.ts", [
      "src/base.ts",
      "Context",
      "version",
      "string",
      "--readonly",
    ]);
    expect(result.success).toBe(true);

    const base = readFile("src/base.ts");
    expect(base).toContain("readonly version: string");

    expect(typecheck().success).toBe(true);
  });
});

describe("organize-imports.ts", () => {
  it("organizes imports across files", () => {
    const result = runScript("organize-imports.ts", ["src/**/*.ts"]);
    expect(result.success).toBe(true);

    // Verify files still compile
    expect(typecheck().success).toBe(true);
  });
});
