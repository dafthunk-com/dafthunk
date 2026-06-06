import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class CNode extends BaseSandboxNode {
  protected static readonly language = "c" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "c",
    name: "C",
    description:
      "Compiles and executes a single C file in a sandboxed container.",
    tags: ["Code", "C", "Execute"],
    documentation:
      "Compiles (`gcc -O2`) and runs a single C source file in an isolated container. The `args` input is exposed via `argc` / `argv`. Compile errors appear in stderr and surface as a non-zero `exitCode`.",
    argvHelp: "argv[1..argc-1]",
    usage: 75,
  });
}
