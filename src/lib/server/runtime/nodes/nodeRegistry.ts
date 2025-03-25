import { NodeRegistry } from "../workflowTypes";
import { SummarizationNode } from "./text/summarizationNode";
import { SentimentNode } from "./text/sentimentNode";
import { TranslationNode } from "./text/translationNode";
import { ImageClassificationNode } from "./image/imageClassificationNode";
import { ImageTransformationNode } from "./image/imageTransformationNode";
import { ImageGenerationNode } from "./image/imageGenerationNode";
import { ImageInpaintingNode } from "./image/imageInpaintingNode";
import {
  ImageUrlLoaderNode,
  JsonStringExtractorNode,
  JsonBooleanExtractorNode,
  JsonNumberExtractorNode,
  JsonJsonExtractorNode,
  StringTemplateNode,
} from "./utility";
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
  UFormNode,
} from "./index";
import { LLaVANode } from "./image/llavaNode";
import { RadioGroupNode } from "./widgets/radioGroupNode";
import { TextAreaNode } from "./widgets/textAreaNode";
import { InputTextNode } from "./widgets/inputTextNode";
import { NumberInputNode } from "./widgets/numberInputNode";
import { MonacoEditorNode } from "./widgets/monacoEditorNode";
import { CanvasDoodleNode } from "./widgets/canvasDoodleNode";

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
  registry.registerImplementation(InputTextNode);
  registry.registerImplementation(NumberInputNode);
  registry.registerImplementation(SliderNode);
  registry.registerImplementation(LLMNode);
  registry.registerImplementation(TTSNode);
  registry.registerImplementation(WhisperNode);
  registry.registerImplementation(UFormNode);
  registry.registerImplementation(SummarizationNode);
  registry.registerImplementation(TranslationNode);
  registry.registerImplementation(SentimentNode);
  registry.registerImplementation(ImageClassificationNode);
  registry.registerImplementation(ImageUrlLoaderNode);
  registry.registerImplementation(ImageGenerationNode);
  registry.registerImplementation(ImageTransformationNode);
  registry.registerImplementation(ImageInpaintingNode);
  registry.registerImplementation(JsonStringExtractorNode);
  registry.registerImplementation(JsonBooleanExtractorNode);
  registry.registerImplementation(JsonNumberExtractorNode);
  registry.registerImplementation(JsonJsonExtractorNode);
  registry.registerImplementation(StringTemplateNode);
  registry.registerImplementation(MonacoEditorNode);
  registry.registerImplementation(LLaVANode);
  registry.registerImplementation(CanvasDoodleNode);
}
