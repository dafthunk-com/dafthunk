import type { Node, NodeType, WorkflowTrigger } from "@dafthunk/types";

import type { ExecutableNode } from "./node-types";
import { MultiStepNode } from "./node-types";

export interface NodeImplementationConstructor<Env = unknown> {
  new (node: Node, env?: Env): ExecutableNode;
  readonly nodeType: NodeType;
}

/**
 * Abstract base class for node registries that provides common functionality
 * for managing node implementations and node operations.
 */
export abstract class BaseNodeRegistry<Env = unknown> {
  protected implementations: Map<string, NodeImplementationConstructor<Env>> =
    new Map();

  public constructor(
    protected env: Env,
    protected developerMode: boolean
  ) {
    this.registerNodes();
  }

  /**
   * Abstract method that each registry must implement to register its specific nodes
   */
  protected abstract registerNodes(): void;

  /**
   * Register a node implementation
   */
  public registerImplementation(
    Implementation: NodeImplementationConstructor<Env>
  ): void {
    if (!Implementation?.nodeType?.type) {
      throw new Error("NodeType is not defined");
    }
    this.implementations.set(Implementation.nodeType.type, Implementation);
  }

  /**
   * Create an executable node instance from a node definition
   */
  public createExecutableNode(node: Node): ExecutableNode | undefined {
    const Implementation = this.implementations.get(node.type);
    if (!Implementation) {
      return undefined;
    }
    return new Implementation(node, this.env);
  }

  /**
   * Get all available node types, optionally filtered by workflow type
   */
  public getNodeTypes(workflowTrigger?: WorkflowTrigger): NodeType[] {
    const nodeTypes = Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );

    if (!workflowTrigger) {
      return nodeTypes;
    }

    return nodeTypes.filter(
      (nodeType) =>
        !nodeType.compatibility ||
        nodeType.compatibility.includes(workflowTrigger)
    );
  }

  /**
   * Check if a node type extends MultiStepNode (manages its own durable steps)
   */
  public isMultiStep(type: string): boolean {
    const Implementation = this.implementations.get(type);
    if (!Implementation) return false;
    return Implementation.prototype instanceof MultiStepNode;
  }

  /**
   * Get a specific node type by its type string
   */
  public getNodeType(nodeType: string): NodeType {
    const Implementation = this.implementations.get(nodeType);
    if (!Implementation) {
      throw new Error(`Node type not found: ${nodeType}`);
    }
    return Implementation.nodeType;
  }
}
