import { AbsoluteValueNode } from "./number/absoluteValueNode";
import { AdditionNode } from "./number/additionNode";
import { DivisionNode } from "./number/divisionNode";
import { ExponentiationNode } from "./number/exponentiationNode";
import { ModuloNode } from "./number/moduloNode";
import { MultiplicationNode } from "./number/multiplicationNode";
import { NumberInputNode } from "./number/numberInputNode";
import { SliderNode } from "./number/sliderNode";
import { SquareRootNode } from "./number/squareRootNode";
import { SubtractionNode } from "./number/subtractionNode";
import { ExecutableNode } from "./types";
import { Node } from "../runtime/types";
import { StableDiffusionXLLightningNode } from "./image/stableDiffusionXLLightningNode";
import { NodeType } from "../api/types";

export interface NodeImplementationConstructor {
  new (node: Node): ExecutableNode;
  readonly nodeType: NodeType;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();

  private constructor() {
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
    this.registerImplementation(ModuloNode);
    this.registerImplementation(ExponentiationNode);
    this.registerImplementation(SquareRootNode);
    this.registerImplementation(AbsoluteValueNode);
    this.registerImplementation(NumberInputNode);
    this.registerImplementation(SliderNode);
    this.registerImplementation(StableDiffusionXLLightningNode);
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public registerImplementation(
    Implementation: NodeImplementationConstructor
  ): void {
    if (!Implementation?.nodeType?.type) {
      throw new Error("NodeType is not defined");
    }
    this.implementations.set(Implementation.nodeType.type, Implementation);
  }

  public createExecutableNode(node: Node): ExecutableNode | undefined {
    const Implementation = this.implementations.get(node.type);
    if (!Implementation) {
      return undefined;
    }
    return new Implementation(node);
  }

  public getApiNodeTypes(): NodeType[] {
    return Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );
  }
}
