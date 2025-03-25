import { NodeRegistry } from "../workflowTypes";
import { SummarizationNode } from "./ai/summarizationNode";
import { SentimentNode } from "./ai/sentimentNode";
import { TranslationNode } from "./ai/translationNode";
import { ImageClassificationNode } from "./ai/imageClassificationNode";
import { ImageUrlLoaderNode, JsonStringExtractorNode, JsonBooleanExtractorNode, JsonNumberExtractorNode, JsonJsonExtractorNode, StringTemplateNode } from "./utility";
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
import { RadioGroupNode } from "./widgets/radioGroupNode";
import { TextAreaNode } from "./widgets/textAreaNode";

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
  registry.registerImplementation(RadioGroupNode);
  registry.registerImplementation(TextAreaNode);
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
  registry.registerImplementation(JsonStringExtractorNode);
  registry.registerImplementation(JsonBooleanExtractorNode);
  registry.registerImplementation(JsonNumberExtractorNode);
  registry.registerImplementation(JsonJsonExtractorNode);
  registry.registerImplementation(StringTemplateNode);
}
