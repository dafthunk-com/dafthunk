import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class BashNode extends BaseSandboxNode {
  protected static readonly language = "bash" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "bash",
    name: "Bash",
    description:
      "Executes a Bash script in a sandboxed container. Captures stdout/stderr and exit code.",
    tags: ["Code", "Bash", "Shell", "Execute"],
    documentation:
      "Runs a Bash script in an isolated container. The `args` input is exposed positionally as `$1`, `$2`, etc. Stdout and stderr are captured separately. The container has no network egress and a fresh working directory per call.",
    argvHelp: "$1, $2, …",
  });
}
