import { Node, WorkflowType } from "@dafthunk/types";
import { NodeType } from "@dafthunk/types";

import { Bindings } from "../context";
import { ExecutableNode } from "./types";

export interface NodeImplementationConstructor {
  new (node: Node, env?: Record<string, any>): ExecutableNode;
  readonly nodeType: NodeType;
}

/**
 * Abstract base class for node registries that provides common functionality
 * for managing node implementations and node operations.
 */
export abstract class BaseNodeRegistry {
  protected implementations: Map<string, NodeImplementationConstructor> =
    new Map();

  public constructor(
    protected env: Bindings,
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
    Implementation: NodeImplementationConstructor
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
  public getNodeTypes(workflowType?: WorkflowType): NodeType[] {
    const nodeTypes = Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );

    if (!workflowType) {
      return nodeTypes;
    }

    return nodeTypes.filter(
      (nodeType) =>
        !nodeType.compatibility || nodeType.compatibility.includes(workflowType)
    );
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
