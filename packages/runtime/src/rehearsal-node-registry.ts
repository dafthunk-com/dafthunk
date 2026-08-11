import type { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { BaseNodeRegistry } from "./base-node-registry";
import type { ExecutableNode, MultiStepNodeContext } from "./node-types";
import { MultiStepNode } from "./node-types";
import { isOutward } from "./outward";
import { synthesizeOutputs } from "./rehearsal-fixtures";

/**
 * A registry decorator that makes an execution safe to run unasked.
 *
 * During a rehearsal, three kinds of node exist:
 *
 * - An **outward** node (`isOutward`) is always replaced with a stub. It
 *   receives its fully composed inputs — so what *would* have been sent is
 *   real — and returns synthetic outputs on its declared ports, billing
 *   nothing. Nothing leaves the platform.
 * - A node with a **required integration input** runs for real when the input
 *   carries an integration id, and is stubbed with fixture data when it does
 *   not. The decision is made at execute time from the composed inputs, so a
 *   tool call that supplies a real id still reads real data.
 * - Everything else runs exactly as it would outside a rehearsal.
 *
 * Note that `buildDependencies` hands the same registry instance to the tool
 * registry, so LLM-agent tool calls to outward nodes are stubbed during a
 * rehearsal too: an agent told to "send the email" gets a synthetic receipt.
 *
 * Unknown node types fall through to the inner registry so its error
 * reporting is unchanged.
 */
export class RehearsalNodeRegistry<
  Env = unknown,
> extends BaseNodeRegistry<Env> {
  public constructor(
    private readonly inner: BaseNodeRegistry<Env>,
    env: Env
  ) {
    super(env, true);
  }

  /** Pure decorator — nothing of its own to register. */
  protected registerNodes(): void {}

  public override getNodeTypes(): NodeType[] {
    return this.inner.getNodeTypes();
  }

  public override getNodeType(nodeType: string): NodeType {
    return this.inner.getNodeType(nodeType);
  }

  /**
   * An outward stub is one plain step — never multi-step, even if the node it
   * replaces would have been. Everything else keeps the inner answer, because
   * a gated node that delegates must be stepped the way its real
   * implementation expects.
   */
  public override isMultiStep(type: string): boolean {
    const nodeType = this.tryGetNodeType(type);
    if (nodeType && isOutward(nodeType)) return false;
    return this.inner.isMultiStep(type);
  }

  public override createExecutableNode(node: Node): ExecutableNode | undefined {
    const nodeType = this.tryGetNodeType(node.type);
    if (!nodeType) return this.inner.createExecutableNode(node);

    if (isOutward(nodeType)) {
      return new RehearsalStubNode(node, nodeType);
    }

    const requiredIntegrations = requiredIntegrationInputs(nodeType);
    if (requiredIntegrations.length > 0) {
      const real = this.inner.createExecutableNode(node);
      if (!real) return undefined;
      return new RehearsalGateNode(node, nodeType, requiredIntegrations, real);
    }

    return this.inner.createExecutableNode(node);
  }

  private tryGetNodeType(type: string): NodeType | undefined {
    try {
      return this.inner.getNodeType(type);
    } catch (_error) {
      return undefined;
    }
  }
}

/** Names of the required integration inputs a node type declares. */
function requiredIntegrationInputs(nodeType: NodeType): string[] {
  return nodeType.inputs
    .filter((input) => input.type === "integration" && input.required)
    .map((input) => input.name);
}

function stubResult(
  node: Node,
  nodeType: NodeType,
  context: MultiStepNodeContext
): NodeExecution {
  return {
    nodeId: node.id,
    status: "completed",
    outputs: synthesizeOutputs(nodeType, context.inputs),
    // Deliberately 0, not the node type's real cost: nothing was performed.
    usage: 0,
  } as NodeExecution;
}

/** Replaces an outward node: succeeds with synthetic receipts, sends nothing. */
class RehearsalStubNode extends MultiStepNode {
  public constructor(
    node: Node,
    private readonly stubbedType: NodeType
  ) {
    super(node);
  }

  public async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    return stubResult(this.node, this.stubbedType, context);
  }
}

/**
 * Wraps a read node that needs an integration: delegates when the composed
 * inputs carry an integration id, stubs with fixtures when they do not.
 */
class RehearsalGateNode extends MultiStepNode {
  public constructor(
    node: Node,
    private readonly gatedType: NodeType,
    private readonly integrationInputs: readonly string[],
    private readonly real: ExecutableNode
  ) {
    super(node);
  }

  public async execute(context: MultiStepNodeContext): Promise<NodeExecution> {
    const bound = this.integrationInputs.every((name) => {
      const value = context.inputs[name];
      return typeof value === "string" && value.length > 0;
    });

    if (bound) return this.real.execute(context);
    return stubResult(this.node, this.gatedType, context);
  }
}
