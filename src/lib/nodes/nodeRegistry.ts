import { NodeRegistry } from "../workflowTypes";
import {
  AdditionNode,
  SubtractionNode,
  MultiplicationNode,
  DivisionNode,
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
}
