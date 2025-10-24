import { BaseNodeRegistry } from "./base-node-registry";
import { AdditionNode } from "./math/addition-node";
import { AvgNode } from "./math/avg-node";
import { DivisionNode } from "./math/division-node";
import { MaxNode } from "./math/max-node";
import { MedianNode } from "./math/median-node";
import { MinNode } from "./math/min-node";
import { MultiplicationNode } from "./math/multiplication-node";
import { NumberInputNode } from "./math/number-input-node";
import { SubtractionNode } from "./math/subtraction-node";
import { SumNode } from "./math/sum-node";

/**
 * Simple test node registry that only includes basic math operations.
 */
export class TestNodeRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
    this.registerImplementation(NumberInputNode);
    this.registerImplementation(SumNode);
    this.registerImplementation(MaxNode);
    this.registerImplementation(MinNode);
    this.registerImplementation(AvgNode);
    this.registerImplementation(MedianNode);
  }
}
