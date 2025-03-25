import { NodeRegistry } from "../workflowTypes";
import { BartLargeCnnNode } from "./text/bartLargeCnnNode";
import { DistilbertSst2Int8Node } from "./text/distilbertSst2Int8Node";
import { M2m10012bNode } from "./text/m2m10012bNode";
import { StableDiffusionXLLightningNode } from "./image/stableDiffusionXLLightningNode";
import { StableDiffusionV15InpaintingNode } from "./image/stableDiffusionV15InpaintingNode";
import { StableDiffusionV15Img2ImgNode } from "./image/stableDiffusionV15Img2ImgNode";
import { Resnet50Node } from "./image/resnet50Node";
import { StableDiffusionXLBase10Node } from "./image/stableDiffusionXLBase10Node";
import { Flux1SchnellNode } from "./image/flux1SchnellNode";
import { DreamShaper8LCMNode } from "./image/dreamShaper8LCMNode";
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
  Llama318BInstructFastNode,
  WhisperNode,
  UformGen2Qwen500mNode,
} from "./index";
import { LLaVA157BHFNode } from "./image/llava157BHFNode";
import { RadioGroupNode } from "./widgets/radioGroupNode";
import { TextAreaNode } from "./widgets/textAreaNode";
import { InputTextNode } from "./widgets/inputTextNode";
import { NumberInputNode } from "./widgets/numberInputNode";
import { MonacoEditorNode } from "./widgets/monacoEditorNode";
import { CanvasDoodleNode } from "./widgets/canvasDoodleNode";
import { DetrResnet50Node } from "./image/detrResnet50Node";
import { MelottsNode } from "./audio/melottsNode";

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
  registry.registerImplementation(Llama318BInstructFastNode);
  registry.registerImplementation(WhisperNode);
  registry.registerImplementation(UformGen2Qwen500mNode);
  registry.registerImplementation(BartLargeCnnNode);
  registry.registerImplementation(M2m10012bNode);
  registry.registerImplementation(DistilbertSst2Int8Node);
  registry.registerImplementation(DetrResnet50Node);
  registry.registerImplementation(Resnet50Node);
  registry.registerImplementation(ImageUrlLoaderNode);
  registry.registerImplementation(StableDiffusionXLLightningNode);
  registry.registerImplementation(StableDiffusionV15InpaintingNode);
  registry.registerImplementation(StableDiffusionV15Img2ImgNode);
  registry.registerImplementation(JsonStringExtractorNode);
  registry.registerImplementation(JsonBooleanExtractorNode);
  registry.registerImplementation(JsonNumberExtractorNode);
  registry.registerImplementation(JsonJsonExtractorNode);
  registry.registerImplementation(StringTemplateNode);
  registry.registerImplementation(MonacoEditorNode);
  registry.registerImplementation(LLaVA157BHFNode);
  registry.registerImplementation(CanvasDoodleNode);
  registry.registerImplementation(StableDiffusionXLBase10Node);
  registry.registerImplementation(Flux1SchnellNode);
  registry.registerImplementation(DreamShaper8LCMNode);
  registry.registerImplementation(MelottsNode);
}
