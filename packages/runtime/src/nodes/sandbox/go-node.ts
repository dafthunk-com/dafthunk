import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class GoNode extends BaseSandboxNode {
  protected static readonly language = "go" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "go",
    name: "Go",
    description:
      "Compiles and executes a single Go file in a sandboxed container.",
    tags: ["Code", "Go", "Execute"],
    documentation:
      "Compiles and runs a single Go file (`go run`) in an isolated container. The `args` input is exposed as `os.Args[1:]`. No module/cache support — keep the program self-contained or use stdlib only.",
    argvHelp: "os.Args[1:]",
  });
}
