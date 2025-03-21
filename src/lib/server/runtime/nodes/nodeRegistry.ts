import { NodeRegistry } from "../workflowTypes";
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
  TTSNode,
  WhisperNode,
  LLaVANode,
  UFormNode,
} from "./index";

/**
 * Register the mathematical operation nodes
 */
export function registerNodes(): void {
  const registry = NodeRegistry.getInstance();

  registry.registerImplementation(AdditionNode);
  registry.registerImplementation(SubtractionNode);
  registry.registerImplementation(MultiplicationNode);
  registry.registerImplementation(DivisionNode);
  registry.registerImplementation(ModuloNode);
  registry.registerImplementation(ExponentiationNode);
  registry.registerImplementation(SquareRootNode);
  registry.registerImplementation(AbsoluteValueNode);
  registry.registerImplementation(SliderNode);
  registry.registerImplementation(LLMNode);
  registry.registerImplementation(TTSNode);
  registry.registerImplementation(WhisperNode);
  registry.registerImplementation(LLaVANode);
  registry.registerImplementation(UFormNode);
  registry.registerImplementation(SummarizationNode);
  registry.registerImplementation(TranslationNode);
  registry.registerImplementation(SentimentNode);
  registry.registerImplementation(ImageClassificationNode);
  registry.registerImplementation(ImageUrlLoaderNode);
  registry.registerImplementation(ImageGenerationNode);
}
