import { SummarizationNode } from "./ai/summarizationNode";
import { SentimentNode } from "./ai/sentimentNode";
import { TranslationNode } from "./ai/translationNode";
import { ImageClassificationNode } from "./ai/imageClassificationNode";
import { ImageUrlLoaderNode } from "./utility/imageUrlLoaderNode";
import { ImageGenerationNode } from "./ai/imageGenerationNode";
import {
  AdditionNode,
  SubtractionNode,
  MultiplicationNode,
  DivisionNode,
  ModuloNode,
  ExponentiationNode,
  SquareRootNode,
  AbsoluteValueNode,
  SliderNode,
  LLMNode,
} from "./index";
import { NodeRegistry } from "@lib/workflowRuntime.ts";

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

  registry.registerImplementation({
    type: "slider",
    createExecutableNode: (node) => new SliderNode(node),
  });

  registry.registerImplementation({
    type: "llm",
    createExecutableNode: (node) => new LLMNode(node),
  });

  registry.registerImplementation({
    type: "summarization",
    createExecutableNode: (node) => new SummarizationNode(node),
  });

  registry.registerImplementation({
    type: "translation",
    createExecutableNode: (node) => new TranslationNode(node),
  });

  registry.registerImplementation({
    type: "sentiment",
    createExecutableNode: (node) => new SentimentNode(node),
  });

  registry.registerImplementation({
    type: "image-classification",
    createExecutableNode: (node) => new ImageClassificationNode(node),
  });

  registry.registerImplementation({
    type: "image-url-loader",
    createExecutableNode: (node) => new ImageUrlLoaderNode(node),
  });

  registry.registerImplementation({
    type: "image-generation",
    createExecutableNode: (node) => new ImageGenerationNode(node),
  });
}
