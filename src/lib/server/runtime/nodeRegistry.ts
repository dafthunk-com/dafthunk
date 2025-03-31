import { AudioRecorderNode } from "../nodes/audio/audioRecorderNode";
import { MelottsNode } from "../nodes/audio/melottsNode";
import { WhisperLargeV3TurboNode } from "../nodes/audio/whisperLargeV3TurboNode";
import { WhisperNode } from "../nodes/audio/whisperNode";
import { WhisperTinyEnNode } from "../nodes/audio/whisperTinyEnNode";
import { CanvasDoodleNode } from "../nodes/image/canvasDoodleNode";
import { DetrResnet50Node } from "../nodes/image/detrResnet50Node";
import { DreamShaper8LCMNode } from "../nodes/image/dreamShaper8LCMNode";
import { Flux1SchnellNode } from "../nodes/image/flux1SchnellNode";
import { ImageUrlLoaderNode } from "../nodes/image/imageUrlLoaderNode";
import { LLaVA157BHFNode } from "../nodes/image/llava157BHFNode";
import { Resnet50Node } from "../nodes/image/resnet50Node";
import { StableDiffusionV15Img2ImgNode } from "../nodes/image/stableDiffusionV15Img2ImgNode";
import { StableDiffusionV15InpaintingNode } from "../nodes/image/stableDiffusionV15InpaintingNode";
import { StableDiffusionXLBase10Node } from "../nodes/image/stableDiffusionXLBase10Node";
import { StableDiffusionXLLightningNode } from "../nodes/image/stableDiffusionXLLightningNode";
import { UformGen2Qwen500mNode } from "../nodes/image/uformGen2Qwen500mNode";
import { WebcamNode } from "../nodes/image/webcamNode";
import { JsonBooleanExtractorNode } from "../nodes/json/jsonBooleanExtractorNode";
import { JsonNumberExtractorNode } from "../nodes/json/jsonNumberExtractorNode";
import { JsonObjectArrayExtractorNode } from "../nodes/json/jsonObjectArrayExtractorNode";
import { JsonStringExtractorNode } from "../nodes/json/jsonStringExtractorNode";
import { JsonTemplateNode } from "../nodes/json/jsonTemplateNode";
import { MonacoEditorNode } from "../nodes/json/monacoEditorNode";
import { AbsoluteValueNode } from "../nodes/number/absoluteValueNode";
import { AdditionNode } from "../nodes/number/additionNode";
import { DivisionNode } from "../nodes/number/divisionNode";
import { ExponentiationNode } from "../nodes/number/exponentiationNode";
import { ModuloNode } from "../nodes/number/moduloNode";
import { MultiplicationNode } from "../nodes/number/multiplicationNode";
import { NumberInputNode } from "../nodes/number/numberInputNode";
import { SliderNode } from "../nodes/number/sliderNode";
import { SquareRootNode } from "../nodes/number/squareRootNode";
import { SubtractionNode } from "../nodes/number/subtractionNode";
import { BartLargeCnnNode } from "../nodes/text/bartLargeCnnNode";
import { BgeRerankerBaseNode } from "../nodes/text/bgeRerankerBaseNode";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbertSst2Int8Node";
import { InputTextNode } from "../nodes/text/inputTextNode";
import { Llama318BInstructFastNode } from "../nodes/text/llama318BInstructFastNode";
import { M2m10012bNode } from "../nodes/text/m2m10012bNode";
import { RadioGroupNode } from "../nodes/text/radioGroupNode";
import { SimpleStringTemplateNode } from "../nodes/text/simpleStringTemplateNode";
import { StringTemplateNode } from "../nodes/text/stringTemplateNode";
import { TextAreaNode } from "../nodes/text/textAreaNode";
import { ExecutableNode, NodeType as NodeTypeDefinition } from "../nodes/types";
import { ParameterRegistry } from "./parameterRegistry";
import { Node, NodeType } from "./types";

export interface NodeImplementationConstructor {
  new (node: Node): ExecutableNode;
  readonly nodeType: NodeTypeDefinition;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();
  private parameterRegistry: ParameterRegistry =
    ParameterRegistry.getInstance();

  private constructor() {
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
    this.registerImplementation(ModuloNode);
    this.registerImplementation(ExponentiationNode);
    this.registerImplementation(SquareRootNode);
    this.registerImplementation(AbsoluteValueNode);
    this.registerImplementation(RadioGroupNode);
    this.registerImplementation(TextAreaNode);
    this.registerImplementation(InputTextNode);
    this.registerImplementation(NumberInputNode);
    this.registerImplementation(SliderNode);
    this.registerImplementation(Llama318BInstructFastNode);
    this.registerImplementation(WhisperNode);
    this.registerImplementation(WhisperLargeV3TurboNode);
    this.registerImplementation(WhisperTinyEnNode);
    this.registerImplementation(UformGen2Qwen500mNode);
    this.registerImplementation(BartLargeCnnNode);
    this.registerImplementation(M2m10012bNode);
    this.registerImplementation(DistilbertSst2Int8Node);
    this.registerImplementation(BgeRerankerBaseNode);
    this.registerImplementation(DetrResnet50Node);
    this.registerImplementation(Resnet50Node);
    this.registerImplementation(ImageUrlLoaderNode);
    this.registerImplementation(StableDiffusionXLLightningNode);
    this.registerImplementation(StableDiffusionV15Img2ImgNode);
    this.registerImplementation(StableDiffusionV15InpaintingNode);
    this.registerImplementation(JsonStringExtractorNode);
    this.registerImplementation(JsonBooleanExtractorNode);
    this.registerImplementation(JsonNumberExtractorNode);
    this.registerImplementation(JsonObjectArrayExtractorNode);
    this.registerImplementation(JsonTemplateNode);
    this.registerImplementation(StringTemplateNode);
    this.registerImplementation(SimpleStringTemplateNode);
    this.registerImplementation(MonacoEditorNode);
    this.registerImplementation(LLaVA157BHFNode);
    this.registerImplementation(CanvasDoodleNode);
    this.registerImplementation(StableDiffusionXLBase10Node);
    this.registerImplementation(Flux1SchnellNode);
    this.registerImplementation(DreamShaper8LCMNode);
    this.registerImplementation(MelottsNode);
    this.registerImplementation(WebcamNode);
    this.registerImplementation(AudioRecorderNode);
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

  public getNodeTypes(): NodeType[] {
    return Array.from(this.implementations.values()).map((implementation) => {
      const inputs = implementation.nodeType.inputs.map((input) => {
        const Type = this.parameterRegistry.get(input.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${input.type}`);
        }
        const value = input.value ? new Type(input.value) : undefined;
        return {
          ...input,
          type: Type,
          value,
        };
      });
      const outputs = implementation.nodeType.outputs.map((output) => {
        const Type = this.parameterRegistry.get(output.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${output.type}`);
        }
        const value = output.value ? new Type(output.value) : undefined;
        return {
          ...output,
          type: Type,
          value,
        };
      });
      return {
        ...implementation.nodeType,
        inputs,
        outputs,
      };
    });
  }
}
