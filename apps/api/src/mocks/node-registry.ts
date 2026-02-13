import { BaseNodeRegistry } from "@dafthunk/runtime";
import { NumberInputNode } from "@dafthunk/runtime/nodes/input/number-input-node";
import { ConditionalForkNode } from "@dafthunk/runtime/nodes/logic/conditional-fork-node";
import { ConditionalJoinNode } from "@dafthunk/runtime/nodes/logic/conditional-join-node";
import { AdditionNode } from "@dafthunk/runtime/nodes/math/addition-node";
import { AvgNode } from "@dafthunk/runtime/nodes/math/avg-node";
import { DivisionNode } from "@dafthunk/runtime/nodes/math/division-node";
import { MaxNode } from "@dafthunk/runtime/nodes/math/max-node";
import { MedianNode } from "@dafthunk/runtime/nodes/math/median-node";
import { MinNode } from "@dafthunk/runtime/nodes/math/min-node";
import { MultiplicationNode } from "@dafthunk/runtime/nodes/math/multiplication-node";
import { SubtractionNode } from "@dafthunk/runtime/nodes/math/subtraction-node";
import { SumNode } from "@dafthunk/runtime/nodes/math/sum-node";
import type { Bindings } from "../context";

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
export class MockNodeRegistry extends BaseNodeRegistry<Bindings> {
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
