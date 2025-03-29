import {
  RuntimeParameterConstructor,
  StringRuntimeParameter,
  NumberRuntimeParameter,
  BooleanRuntimeParameter,
  ArrayRuntimeParameter,
  BinaryRuntimeParameter,
  JsonRuntimeParameter,
  ImageRuntimeParameter,
  AudioRuntimeParameter,
  Node,
  NodeType,
} from "./types";
import {
  ParameterType as NodeParameterType,
  StringParameter as NodeStringParameter,
  NumberParameter as NodeNumberParameter,
  BooleanParameter as NodeBooleanParameter,
  ArrayParameter as NodeArrayParameter,
  BinaryParameter as NodeBinaryParameter,
  ImageParameter as NodeImageParameter,
  JsonParameter as NodeJsonParameter,
  AudioParameter as NodeAudioParameter,
} from "../nodes/types";
import { ExecutableNode } from "../nodes/types";
import { NodeType as NodeTypeDefinition } from "../nodes/types";
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

export class RuntimeParameterRegistry {
  private static instance: RuntimeParameterRegistry;
  private implementations: Map<
    typeof NodeParameterType,
    RuntimeParameterConstructor
  > = new Map();

  private constructor() {
    // Register built-in types
    this.register(NodeStringParameter, StringRuntimeParameter);
    this.register(NodeNumberParameter, NumberRuntimeParameter);
    this.register(NodeBooleanParameter, BooleanRuntimeParameter);
    this.register(NodeArrayParameter, ArrayRuntimeParameter);
    this.register(NodeBinaryParameter, BinaryRuntimeParameter);
    this.register(NodeJsonParameter, JsonRuntimeParameter);
    this.register(NodeImageParameter, ImageRuntimeParameter);
    this.register(NodeAudioParameter, AudioRuntimeParameter);
  }

  public static getInstance(): RuntimeParameterRegistry {
    if (!RuntimeParameterRegistry.instance) {
      RuntimeParameterRegistry.instance = new RuntimeParameterRegistry();
    }
    return RuntimeParameterRegistry.instance;
  }

  public register(
    type: typeof NodeParameterType,
    implementation: RuntimeParameterConstructor
  ): void {
    this.implementations.set(type, implementation);
  }

  public get(
    type: typeof NodeParameterType
  ): RuntimeParameterConstructor | undefined {
    return this.implementations.get(type);
  }

  public validate(
    type: typeof NodeParameterType,
    value: any
  ): { isValid: boolean; error?: string } {
    const Implementation = this.get(type);
    if (!Implementation) {
      return { isValid: false, error: `Unknown parameter type: ${type}` };
    }
    return new Implementation(value).validate();
  }
}
export interface NodeImplementationConstructor {
  new (node: Node): ExecutableNode;
  readonly nodeType: NodeTypeDefinition;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();
  private parameterRegistry: RuntimeParameterRegistry =
    RuntimeParameterRegistry.getInstance();

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

  public getRuntimeNodeTypes(): NodeType[] {
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
  registry.registerImplementation(WhisperLargeV3TurboNode);
  registry.registerImplementation(WhisperTinyEnNode);
  registry.registerImplementation(UformGen2Qwen500mNode);
  registry.registerImplementation(BartLargeCnnNode);
  registry.registerImplementation(M2m10012bNode);
  registry.registerImplementation(DistilbertSst2Int8Node);
  registry.registerImplementation(BgeRerankerBaseNode);
  registry.registerImplementation(DetrResnet50Node);
  registry.registerImplementation(Resnet50Node);
  registry.registerImplementation(ImageUrlLoaderNode);
  registry.registerImplementation(StableDiffusionXLLightningNode);
  registry.registerImplementation(StableDiffusionV15Img2ImgNode);
  registry.registerImplementation(StableDiffusionV15InpaintingNode);
  registry.registerImplementation(JsonStringExtractorNode);
  registry.registerImplementation(JsonBooleanExtractorNode);
  registry.registerImplementation(JsonNumberExtractorNode);
  registry.registerImplementation(JsonObjectArrayExtractorNode);
  registry.registerImplementation(JsonTemplateNode);
  registry.registerImplementation(StringTemplateNode);
  registry.registerImplementation(SimpleStringTemplateNode);
  registry.registerImplementation(MonacoEditorNode);
  registry.registerImplementation(LLaVA157BHFNode);
  registry.registerImplementation(CanvasDoodleNode);
  registry.registerImplementation(StableDiffusionXLBase10Node);
  registry.registerImplementation(Flux1SchnellNode);
  registry.registerImplementation(DreamShaper8LCMNode);
  registry.registerImplementation(MelottsNode);
  registry.registerImplementation(WebcamNode);
  registry.registerImplementation(AudioRecorderNode);
}
