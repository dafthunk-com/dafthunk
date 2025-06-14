import { BaseNodeRegistry } from "./base-node-registry";
import { AdditionNode } from "./math/addition-node";
import { DivisionNode } from "./math/division-node";
import { MultiplicationNode } from "./math/multiplication-node";
import { SubtractionNode } from "./math/subtraction-node";

/**
 * Simple test node registry that only includes basic math operations.
 */
export class TestNodeRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
  }
}
