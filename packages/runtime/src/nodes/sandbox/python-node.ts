import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class PythonNode extends BaseSandboxNode {
  protected static readonly language = "python" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "python",
    name: "Python",
    description:
      "Executes Python 3 in a sandboxed container. Captures stdout/stderr and exit code.",
    tags: ["Code", "Python", "Execute"],
    documentation:
      "Runs Python 3 in an isolated container. The `args` input is exposed as `sys.argv[1:]`. Stdout and stderr are captured separately; a non-zero exit code is surfaced but does not fail the node.",
    argvHelp: "sys.argv[1:]",
  });
}
