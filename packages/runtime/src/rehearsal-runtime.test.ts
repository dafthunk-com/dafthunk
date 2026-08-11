/**
 * The rehearsal decorator, exercised through a full runtime run.
 *
 * The registry-level tests pin the stub rules; this pins what the rest of the
 * engine does around them: composed inputs reach the stub, its synthetic
 * outputs feed downstream nodes through the ordinary dataflow, the stub bills
 * nothing, and the persisted record says the run was a rehearsal.
 */

import type { NodeExecution, NodeType, Workflow } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  buildTestDependencies,
  DirectRuntime,
  RecordingExecutionStore,
} from "./__test-stubs__/runtime-harness";
import { BaseNodeRegistry } from "./base-node-registry";
import type { RuntimeParams } from "./base-runtime";
import type { NodeContext } from "./node-types";
import { ExecutableNode } from "./node-types";
import { RehearsalNodeRegistry } from "./rehearsal-node-registry";

/** Produces the text a send node would be handed. */
class ComposeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "compose",
    name: "Compose",
    type: "compose",
    description: "Produces a fixed line of text (test node)",
    tags: ["Test"],
    icon: "pen",
    inputs: [],
    outputs: [{ name: "out", type: "string" }],
  };

  async execute(): Promise<NodeExecution> {
    return this.createSuccessResult({ out: "Hello world" });
  }
}

/** An outward write. Its real implementation must never run in a rehearsal. */
class ShareNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "share-post-x",
    name: "Share Post",
    type: "share-post-x",
    description: "Publishes a post (test node)",
    tags: ["Test"],
    icon: "send",
    usage: 20,
    inputs: [
      {
        name: "integrationId",
        type: "integration",
        provider: "x",
        required: true,
        hidden: true,
      },
      { name: "text", type: "string", required: true },
    ],
    outputs: [
      { name: "id", type: "string", hidden: true },
      { name: "text", type: "string" },
    ],
  };

  async execute(): Promise<NodeExecution> {
    throw new Error("a real outward write ran during a rehearsal");
  }
}

/** Consumes the stub's output, proving synthetic values flow downstream. */
class EchoNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "echo",
    name: "Echo",
    type: "echo",
    description: "Echoes its input (test node)",
    tags: ["Test"],
    icon: "repeat",
    inputs: [{ name: "in", type: "string", required: true }],
    outputs: [{ name: "result", type: "string" }],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    return this.createSuccessResult({ result: String(context.inputs.in) });
  }
}

class InnerRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    this.registerImplementation(ComposeNode);
    this.registerImplementation(ShareNode);
    this.registerImplementation(EchoNode);
  }
}

/** compose → share (outward, stubbed) → echo. */
function workflow(): Workflow {
  return {
    id: "wf-rehearsal",
    name: "Rehearsal",
    trigger: "manual",
    nodes: [
      ComposeNode.create({ id: "compose", position: { x: 0, y: 0 } }),
      ShareNode.create({ id: "share", position: { x: 0, y: 0 } }),
      EchoNode.create({ id: "echo", position: { x: 0, y: 0 } }),
    ],
    edges: [
      {
        source: "compose",
        sourceOutput: "out",
        target: "share",
        targetInput: "text",
      },
      {
        source: "share",
        sourceOutput: "text",
        target: "echo",
        targetInput: "in",
      },
    ],
  };
}

async function runRehearsal() {
  const store = new RecordingExecutionStore();
  const runtime = new DirectRuntime(
    buildTestDependencies({
      nodeRegistry: new RehearsalNodeRegistry(new InnerRegistry({}, false), {}),
      executionStore: store,
    })
  );

  const execution = await runtime.run(
    {
      workflow: workflow(),
      userId: "user-1",
      organizationId: "org-1",
      computeCredits: 1000,
      unlimitedUsage: true,
      rehearsal: true,
    } as RuntimeParams,
    "exec-rehearsal"
  );

  return { execution, record: store.last() };
}

describe("a rehearsal run", () => {
  it("completes with the outward step stubbed and downstream fed", async () => {
    const { record } = await runRehearsal();

    expect(record.status).toBe("completed");

    const byNode = new Map(
      record.nodeExecutions.map((entry) => [entry.nodeId, entry])
    );
    // The stub echoed the composed text on its declared port…
    expect(byNode.get("share")?.outputs).toEqual({
      id: "rehearsal-id",
      text: "Hello world",
    });
    // …and the downstream consumer received it through ordinary dataflow.
    expect(byNode.get("echo")?.outputs).toEqual({ result: "Hello world" });
  });

  it("bills nothing for the stubbed step and keeps real usage", async () => {
    const { record } = await runRehearsal();

    const byNode = new Map(
      record.nodeExecutions.map((entry) => [entry.nodeId, entry])
    );
    expect(byNode.get("share")?.usage).toBe(0);
    // The real nodes carry their default cost of 1 each.
    expect(byNode.get("compose")?.usage).toBe(1);
    expect(byNode.get("echo")?.usage).toBe(1);
  });

  it("stamps the record and the returned execution as a rehearsal", async () => {
    const { execution, record } = await runRehearsal();

    expect(execution.rehearsal).toBe(true);
    expect(record.rehearsal).toBe(true);
  });
});
