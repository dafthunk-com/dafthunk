import type { NodeType } from "@dafthunk/types";

import { BaseSandboxNode, buildSandboxNodeType } from "./base-sandbox-node";

export class JavaNode extends BaseSandboxNode {
  protected static readonly language = "java" as const;

  public static readonly nodeType: NodeType = buildSandboxNodeType({
    id: "java",
    name: "Java",
    description:
      "Compiles and executes a single Java file in a sandboxed container.",
    tags: ["Code", "Java", "Execute"],
    documentation:
      "Runs a single Java source file under `java Main.java` (JDK 11+ single-file source-launch) in an isolated container. Your code must declare `public class Main` — the filename is fixed. The `args` input is exposed via `String[] args` on `main`. JVM cold-start dominates; expect multi-second runs.",
    argvHelp: "String[] args",
    usage: 100,
  });
}
