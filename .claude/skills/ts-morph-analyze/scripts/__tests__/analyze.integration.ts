import { execSync } from "child_process";
import * as path from "path";
import { describe, expect, it } from "vitest";

const SKILL_DIR = path.resolve(__dirname, "../..");
const FIXTURES_DIR = path.join(SKILL_DIR, "test-fixtures");
const SCRIPTS_DIR = path.join(SKILL_DIR, "scripts");
const TSCONFIG = path.join(FIXTURES_DIR, "tsconfig.json");

function runScript(script: string, args: string[]): { success: boolean; output: string } {
  const scriptPath = path.join(SCRIPTS_DIR, script);

  // Convert relative paths to absolute
  const resolvedArgs = args.map((arg) => {
    if (arg.startsWith("src/") || (arg.endsWith(".ts") && !arg.startsWith("/"))) {
      return path.join(FIXTURES_DIR, arg);
    }
    return arg;
  });

  const fullArgs = [TSCONFIG, ...resolvedArgs];

  try {
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

describe("summarize-class.ts", () => {
  it("summarizes an abstract class", () => {
    const result = runScript("summarize-class.ts", ["src/base.ts", "ExecutableNode"]);
    expect(result.success).toBe(true);

    // Should include public members
    expect(result.output).toContain("export abstract class ExecutableNode");
    expect(result.output).toContain("nodeId: string");
    expect(result.output).toContain("readonly");
    expect(result.output).toContain("constructor(nodeId: string)");
    expect(result.output).toContain("abstract execute(ctx: Context): Promise<Response>");
    expect(result.output).toContain("getState(): string");
    expect(result.output).toContain("reset(): void");

    // Should NOT include private members by default
    expect(result.output).not.toContain("_state");
    expect(result.output).not.toContain("private");
  });

  it("includes private members with --private flag", () => {
    const result = runScript("summarize-class.ts", ["src/base.ts", "ExecutableNode", "--private"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("private _state: string");
    expect(result.output).toContain("protected executionCount: number");
    expect(result.output).toContain("protected createResponse");
  });

  it("includes JSDoc comments with --jsdoc flag", () => {
    const result = runScript("summarize-class.ts", ["src/base.ts", "ExecutableNode", "--jsdoc"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("/**");
    expect(result.output).toContain("Base class for executable nodes");
    expect(result.output).toContain("Unique identifier");
  });

  it("summarizes an interface", () => {
    const result = runScript("summarize-class.ts", ["src/base.ts", "Handler"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("export interface Handler");
    expect(result.output).toContain("name: string");
    expect(result.output).toContain("handle(request: Request, ctx: Context): Promise<Response>");
  });

  it("shows extends and implements", () => {
    const result = runScript("summarize-class.ts", ["src/impl.ts", "TextNode"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("class TextNode extends ExecutableNode");
  });
});

describe("list-exports.ts", () => {
  it("lists exports from a file", () => {
    const result = runScript("list-exports.ts", ["src/base.ts"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("export interface Handler");
    expect(result.output).toContain("export interface Context");
    expect(result.output).toContain("export abstract class ExecutableNode");
    expect(result.output).toContain("export type Result<T>");
    expect(result.output).toContain("export function formatDate");
    expect(result.output).toContain("export const DEFAULT_TIMEOUT");
  });

  it("filters by types only", () => {
    const result = runScript("list-exports.ts", ["src/base.ts", "--types-only"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("interface Handler");
    expect(result.output).toContain("type Result");
    expect(result.output).not.toContain("class ExecutableNode");
    expect(result.output).not.toContain("function formatDate");
  });

  it("filters by classes only", () => {
    const result = runScript("list-exports.ts", ["src/impl.ts", "--classes-only"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("class UserHandler");
    expect(result.output).toContain("class TextNode");
    expect(result.output).toContain("class NumberNode");
    expect(result.output).not.toContain("interface");
    expect(result.output).not.toContain("function");
  });

  it("filters by functions only", () => {
    const result = runScript("list-exports.ts", ["src/base.ts", "--functions-only"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("function formatDate");
    expect(result.output).not.toContain("interface");
    expect(result.output).not.toContain("class");
  });
});

describe("show-hierarchy.ts", () => {
  it("shows class ancestry", () => {
    const result = runScript("show-hierarchy.ts", ["src/impl.ts", "TextNode"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("TextNode");
    expect(result.output).toContain("extends:");
    expect(result.output).toContain("ExecutableNode");
  });

  it("shows interface implementation", () => {
    const result = runScript("show-hierarchy.ts", ["src/impl.ts", "UserHandler"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("UserHandler");
    expect(result.output).toContain("implements:");
    expect(result.output).toContain("Handler");
  });

  it("shows descendants with --descendants flag", () => {
    const result = runScript("show-hierarchy.ts", ["src/impl.ts", "NumberNode", "--descendants"]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("NumberNode");
    expect(result.output).toContain("descendants:");
    expect(result.output).toContain("AdvancedNumberNode");
  });
});

describe("extract-interface.ts", () => {
  it("extracts public members as interface", () => {
    const result = runScript("extract-interface.ts", ["src/impl.ts", "UserService"]);
    expect(result.success).toBe(true);

    // Should include public members
    expect(result.output).toContain("export interface IUserService");
    expect(result.output).toContain("readonly id: string");
    expect(result.output).toContain("name: string"); // getter
    expect(result.output).toContain("getEmail(): Promise<string>");
    expect(result.output).toContain("update(data: Record<string, unknown>): Promise<void>");

    // Should NOT include private/protected members
    expect(result.output).not.toContain("_name");
    expect(result.output).not.toContain("config");
    expect(result.output).not.toContain("validate");
    expect(result.output).not.toContain("format");

    // Should NOT include static members
    expect(result.output).not.toContain("create");
  });

  it("uses custom interface name", () => {
    const result = runScript("extract-interface.ts", [
      "src/impl.ts",
      "UserService",
      "--name=IUser",
    ]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("export interface IUser");
    expect(result.output).not.toContain("IUserService");
  });

  it("includes protected members with --include-protected", () => {
    const result = runScript("extract-interface.ts", [
      "src/impl.ts",
      "UserService",
      "--include-protected",
    ]);
    expect(result.success).toBe(true);

    expect(result.output).toContain("config: Record<string, unknown>");
    expect(result.output).toContain("format(data: unknown): string");

    // Still should NOT include private
    expect(result.output).not.toContain("validate");
    expect(result.output).not.toContain("_name");
  });
});
