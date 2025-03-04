import { NodeRegistry } from "../workflowTypes";
import {
  AdditionNode,
  SubtractionNode,
  MultiplicationNode,
  DivisionNode,
  ModuloNode,
  ExponentiationNode,
  SquareRootNode,
  AbsoluteValueNode
} from "./index";

/**
 * Register the mathematical operation nodes
 */
export function registerNodes(): void {
  const registry = NodeRegistry.getInstance();

  registry.registerImplementation({
    type: "addition",
    createExecutableNode: (node) => new AdditionNode(node),
  });

  registry.registerImplementation({
    type: "subtraction",
    createExecutableNode: (node) => new SubtractionNode(node),
  });

  registry.registerImplementation({
    type: "multiplication",
    createExecutableNode: (node) => new MultiplicationNode(node),
  });

  registry.registerImplementation({
    type: "division",
    createExecutableNode: (node) => new DivisionNode(node),
  });
  
  registry.registerImplementation({
    type: "modulo",
    createExecutableNode: (node) => new ModuloNode(node),
  });
  
  registry.registerImplementation({
    type: "exponentiation",
    createExecutableNode: (node) => new ExponentiationNode(node),
  });
  
  registry.registerImplementation({
    type: "square-root",
    createExecutableNode: (node) => new SquareRootNode(node),
  });
  
  registry.registerImplementation({
    type: "absolute-value",
    createExecutableNode: (node) => new AbsoluteValueNode(node),
  });
}
