import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

/**
 * Node.js in a sandboxed container — complements the V8-isolate `javascript`
 * node by providing access to Node APIs, npm-installed packages, and the
 * filesystem. Slower startup; use the V8 node for short pure-JS snippets.
 */
export class NodejsNode extends BaseSandboxNode {
  protected static readonly language = "node" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "nodejs",
    name: "Node.js",
    description:
      "Executes Node.js (ESM) in a sandboxed container with access to Node APIs and npm packages.",
    tags: ["Code", "Node.js", "JavaScript", "Execute"],
    documentation:
      "Runs an ES module under Node.js in an isolated container. The `args` input is exposed as `process.argv.slice(2)`. Use this when you need Node APIs (fs, child_process) or npm packages baked into the sandbox image; otherwise prefer the lighter-weight V8 `javascript` node.",
    argvHelp: "process.argv.slice(2)",
  });
}
