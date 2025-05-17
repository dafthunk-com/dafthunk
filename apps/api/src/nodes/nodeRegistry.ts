import { Node } from "@dafthunk/types";
import { NodeType } from "@dafthunk/types";

import { AudioRecorderNode } from "./audio/audioRecorderNode";
import { MelottsNode } from "./audio/melottsNode";
import { WhisperLargeV3TurboNode } from "./audio/whisperLargeV3TurboNode";
import { WhisperNode } from "./audio/whisperNode";
import { WhisperTinyEnNode } from "./audio/whisperTinyEnNode";
import { DocumentNode } from "./document/documentNode";
import { ToMarkdownNode } from "./document/toMarkdownNode";
import { CanvasDoodleNode } from "./image/canvasDoodleNode";
import { DetrResnet50Node } from "./image/detrResnet50Node";
import { DreamShaper8LCMNode } from "./image/dreamShaper8LCMNode";
import { Flux1SchnellNode } from "./image/flux1SchnellNode";
import { ImageUrlLoaderNode } from "./image/imageUrlLoaderNode";
import { LLaVA157BHFNode } from "./image/llava157BHFNode";
import { Resnet50Node } from "./image/resnet50Node";
import { StableDiffusionV15Img2ImgNode } from "./image/stableDiffusionV15Img2ImgNode";
import { StableDiffusionV15InpaintingNode } from "./image/stableDiffusionV15InpaintingNode";
import { StableDiffusionXLBase10Node } from "./image/stableDiffusionXLBase10Node";
import { StableDiffusionXLLightningNode } from "./image/stableDiffusionXLLightningNode";
import { UformGen2Qwen500mNode } from "./image/uformGen2Qwen500mNode";
import { WebcamNode } from "./image/webcamNode";
import { JsonBooleanExtractorNode } from "./json/jsonBooleanExtractorNode";
import { JsonNumberExtractorNode } from "./json/jsonNumberExtractorNode";
import { JsonObjectArrayExtractorNode } from "./json/jsonObjectArrayExtractorNode";
import { JsonStringExtractorNode } from "./json/jsonStringExtractorNode";
import { JsonTemplateNode } from "./json/jsonTemplateNode";
import { MonacoEditorNode } from "./json/monacoEditorNode";
import { CloudflareBrowserContentNode } from "./net/cloudflareBrowserContentNode";
import { CloudflareBrowserJsonNode } from "./net/cloudflareBrowserJsonNode";
import { CloudflareBrowserLinksNode } from "./net/cloudflareBrowserLinksNode";
import { CloudflareBrowserMarkdownNode } from "./net/cloudflareBrowserMarkdownNode";
import { CloudflareBrowserPdfNode } from "./net/cloudflareBrowserPdfNode";
import { CloudflareBrowserScrapeNode } from "./net/cloudflareBrowserScrapeNode";
import { CloudflareBrowserScreenshotNode } from "./net/cloudflareBrowserScreenshotNode";
import { CloudflareBrowserSnapshotNode } from "./net/cloudflareBrowserSnapshotNode";
import { HttpRequestNode } from "./net/httpRequestNode";
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
import { BooleanParameterNode } from "./parameter/booleanParameterNode";
import { JsonBodyNode } from "./parameter/jsonBodyNode";
import { NumberParameterNode } from "./parameter/numberParameterNode";
import { StringParameterNode } from "./parameter/stringParameterNode";
import { BartLargeCnnNode } from "./text/bartLargeCnnNode";
import { BgeRerankerBaseNode } from "./text/bgeRerankerBaseNode";
import { DeepseekR1Node } from "./text/deepseekR1Node";
import { DistilbertSst2Int8Node } from "./text/distilbertSst2Int8Node";
import { InputTextNode } from "./text/inputTextNode";
import { Llama318BInstructFastNode } from "./text/llama318BInstructFastNode";
import { Llama3370BInstructFastNode } from "./text/llama3370BInstructFastNode";
import { M2m10012bNode } from "./text/m2m10012bNode";
import { RadioGroupNode } from "./text/radioGroupNode";
import { SendgridEmailNode } from "./text/sendgridEmailNode";
import { SimpleStringTemplateNode } from "./text/simpleStringTemplateNode";
import { StringTemplateNode } from "./text/stringTemplateNode";
import { TextAreaNode } from "./text/textAreaNode";
import { TwilioSmsNode } from "./text/twilioSmsNode";
import { ExecutableNode } from "./types";
import { ResendEmailNode } from "./text/resendEmailNode";

export interface NodeImplementationConstructor {
  new (node: Node): ExecutableNode;
  readonly nodeType: NodeType;
}

const hasCloudflare =
  process.env.CLOUDFLARE_API_KEY && 
  process.env.CLOUDFLARE_ACCOUNT_ID;

const hasTwilioSms =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER;

const hasTwilioEmail =
  process.env.SENDGRID_API_KEY && 
  process.env.SENDGRID_DEFAULT_FROM;


const hasResendEmail =
  process.env.RESEND_API_KEY && 
  process.env.RESEND_DEFAULT_FROM;

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();

  private constructor() {
    // Register parameter nodes
    this.registerImplementation(StringParameterNode);
    this.registerImplementation(NumberParameterNode);
    this.registerImplementation(BooleanParameterNode);
    this.registerImplementation(JsonBodyNode);
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
    this.registerImplementation(Llama3370BInstructFastNode);
    this.registerImplementation(DeepseekR1Node);
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
    this.registerImplementation(ToMarkdownNode);
    this.registerImplementation(DocumentNode);
    this.registerImplementation(HttpRequestNode);

    // Cloudflare
    if (hasCloudflare) {
      this.registerImplementation(CloudflareBrowserContentNode);
      this.registerImplementation(CloudflareBrowserJsonNode);
      this.registerImplementation(CloudflareBrowserLinksNode);
      this.registerImplementation(CloudflareBrowserMarkdownNode);
      this.registerImplementation(CloudflareBrowserPdfNode);
      this.registerImplementation(CloudflareBrowserScreenshotNode);
      this.registerImplementation(CloudflareBrowserScrapeNode);
      this.registerImplementation(CloudflareBrowserSnapshotNode);
    }

    // Twilio
    if (hasTwilioSms) {
      this.registerImplementation(TwilioSmsNode);
    }

    // Sendgrid
    if (hasTwilioEmail) {
      this.registerImplementation(SendgridEmailNode);
    }

    // Resend
    if (hasResendEmail) {
      this.registerImplementation(ResendEmailNode);
    }
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
    return Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );
  }
}
