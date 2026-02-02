import { BaseNodeRegistry } from "../runtime/base-node-registry";
import { NumberInputNode } from "../nodes/input/number-input-node";
import { ConditionalForkNode } from "../nodes/logic/conditional-fork-node";
import { ConditionalJoinNode } from "../nodes/logic/conditional-join-node";
import { AdditionNode } from "../nodes/math/addition-node";
import { AvgNode } from "../nodes/math/avg-node";
import { DivisionNode } from "../nodes/math/division-node";
import { MaxNode } from "../nodes/math/max-node";
import { MedianNode } from "../nodes/math/median-node";
import { MinNode } from "../nodes/math/min-node";
import { MultiplicationNode } from "../nodes/math/multiplication-node";
import { SubtractionNode } from "../nodes/math/subtraction-node";
import { SumNode } from "../nodes/math/sum-node";

/**
 * Mock Node Registry
 *
 * Lightweight node registry for testing that only includes basic math operations
 * and logic nodes.
 * Uses real node implementations but provides a minimal subset to avoid loading
 * heavy dependencies (like geotiff).
 *
 * Includes:
 * - Addition, Subtraction, Multiplication, Division
 * - Number Input
 * - Sum, Max, Min, Avg, Median
 * - Conditional Fork, Conditional Join
 */
export class MockNodeRegistry extends BaseNodeRegistry {
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
    this.registerImplementation(ConditionalForkNode);
    this.registerImplementation(ConditionalJoinNode);
  }
}
