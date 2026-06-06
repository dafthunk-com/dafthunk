import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class RustNode extends BaseSandboxNode {
  protected static readonly language = "rust" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "rust",
    name: "Rust",
    description:
      "Compiles and executes a single Rust file in a sandboxed container.",
    tags: ["Code", "Rust", "Execute"],
    documentation:
      "Compiles (`rustc -O`) and runs a single Rust source file in an isolated container. The `args` input is exposed via `std::env::args()`. No cargo / external crates — keep the program self-contained. Compile latency dominates; expect multi-second cold runs.",
    argvHelp: "std::env::args().skip(1)",
    usage: 100,
  });
}
