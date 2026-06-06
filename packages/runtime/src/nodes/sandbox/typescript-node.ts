import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class TypescriptNode extends BaseSandboxNode {
  protected static readonly language = "typescript" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "typescript",
    name: "TypeScript",
    description:
      "Executes TypeScript (via tsx) in a sandboxed container with access to Node APIs and npm packages.",
    tags: ["Code", "TypeScript", "Execute"],
    documentation:
      "Runs a TypeScript file under `tsx` in an isolated container. The `args` input is exposed as `process.argv.slice(2)`. No tsconfig is required — `tsx` handles transpilation per-file.",
    argvHelp: "process.argv.slice(2)",
  });
}
