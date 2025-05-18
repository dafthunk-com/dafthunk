import { Node } from "@dafthunk/types";
import { NodeType } from "@dafthunk/types";

import { AudioRecorderNode } from "./audio/audio-recorder-node";
import { MelottsNode } from "./audio/melotts-node";
import { WhisperLargeV3TurboNode } from "./audio/whisper-large-v3-turbo-node";
import { WhisperNode } from "./audio/whisper-node";
import { WhisperTinyEnNode } from "./audio/whisper-tiny-en-node";
import { DocumentNode } from "./document/document-node";
import { ToMarkdownNode } from "./document/to-markdown-node";
import { CanvasDoodleNode } from "./image/canvas-doodle-node";
import { DetrResnet50Node } from "./image/detr-resnet50-node";
import { DreamShaper8LCMNode } from "./image/dream-shaper8-lcm-node";
import { Flux1SchnellNode } from "./image/flux1-schnell-node";
import { ImageUrlLoaderNode } from "./image/image-url-loader-node";
import { LLaVA157BHFNode } from "./image/llava157-bhf-node";
import { Resnet50Node } from "./image/resnet50-node";
import { StableDiffusionV15Img2ImgNode } from "./image/stable-diffusion-v15-img2-img-node";
import { StableDiffusionV15InpaintingNode } from "./image/stable-diffusion-v15-inpainting-node";
import { StableDiffusionXLBase10Node } from "./image/stable-diffusion-xl-base10-node";
import { StableDiffusionXLLightningNode } from "./image/stable-diffusion-xl-lightning-node";
import { UformGen2Qwen500mNode } from "./image/uform-gen2-qwen500m-node";
import { WebcamNode } from "./image/webcam-node";
import { JsonBooleanExtractorNode } from "./json/json-boolean-extractor-node";
import { JsonNumberExtractorNode } from "./json/json-number-extractor-node";
import { JsonObjectArrayExtractorNode } from "./json/json-object-array-extractor-node";
import { JsonStringExtractorNode } from "./json/json-string-extractor-node";
import { JsonTemplateNode } from "./json/json-template-node";
import { MonacoEditorNode } from "./json/monaco-editor-node";
import { CloudflareBrowserContentNode } from "./net/cloudflare-browser-content-node";
import { CloudflareBrowserJsonNode } from "./net/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "./net/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "./net/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "./net/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "./net/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "./net/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "./net/cloudflare-browser-snapshot-node";
import { HttpRequestNode } from "./net/http-request-node";
import { AbsoluteValueNode } from "./number/absolute-value-node";
import { AdditionNode } from "./number/addition-node";
import { DivisionNode } from "./number/division-node";
import { ExponentiationNode } from "./number/exponentiation-node";
import { ModuloNode } from "./number/modulo-node";
import { MultiplicationNode } from "./number/multiplication-node";
import { NumberInputNode } from "./number/number-input-node";
import { SliderNode } from "./number/slider-node";
import { SquareRootNode } from "./number/square-root-node";
import { SubtractionNode } from "./number/subtraction-node";
import { BooleanParameterNode } from "./parameter/boolean-parameter-node";
import { JsonBodyNode } from "./parameter/json-body-node";
import { NumberParameterNode } from "./parameter/number-parameter-node";
import { StringParameterNode } from "./parameter/string-parameter-node";
import { BartLargeCnnNode } from "./text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "./text/bge-reranker-base-node";
import { DeepseekR1Node } from "./text/deepseek-r1-node";
import { DistilbertSst2Int8Node } from "./text/distilbert-sst2-int8-node";
import { InputTextNode } from "./text/input-text-node";
import { Llama318BInstructFastNode } from "./text/llama318-b-instruct-fast-node";
import { Llama3370BInstructFastNode } from "./text/llama3370-b-instruct-fast-node";
import { M2m10012bNode } from "./text/m2m10012b-node";
import { RadioGroupNode } from "./text/radio-group-node";
import { ResendEmailNode } from "./text/resend-email-node";
import { SendgridEmailNode } from "./text/sendgrid-email-node";
import { SimpleStringTemplateNode } from "./text/simple-string-template-node";
import { StringTemplateNode } from "./text/string-template-node";
import { TextAreaNode } from "./text/text-area-node";
import { TwilioSmsNode } from "./text/twilio-sms-node";
import { ExecutableNode } from "./types";

export interface NodeImplementationConstructor {
  new (node: Node, env?: Record<string, any>): ExecutableNode;
  readonly nodeType: NodeType;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private static env: Record<string, any> | undefined;

  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();

  private hasCloudflare: boolean = false;
  private hasTwilioSms: boolean = false;
  private hasSendgridEmail: boolean = false;
  private hasResendEmail: boolean = false;

  private constructor(env: Record<string, any>) {
    this.hasCloudflare = !!(
      env.CLOUDFLARE_API_KEY && env.CLOUDFLARE_ACCOUNT_ID
    );
    this.hasTwilioSms = !!(
      env.TWILIO_ACCOUNT_SID &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_PHONE_NUMBER
    );
    this.hasSendgridEmail = !!(
      env.SENDGRID_API_KEY && env.SENDGRID_DEFAULT_FROM
    );
    this.hasResendEmail = !!(env.RESEND_API_KEY && env.RESEND_DEFAULT_FROM);

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

    if (this.hasCloudflare) {
      this.registerImplementation(CloudflareBrowserContentNode);
      this.registerImplementation(CloudflareBrowserJsonNode);
      this.registerImplementation(CloudflareBrowserLinksNode);
      this.registerImplementation(CloudflareBrowserMarkdownNode);
      this.registerImplementation(CloudflareBrowserPdfNode);
      this.registerImplementation(CloudflareBrowserScreenshotNode);
      this.registerImplementation(CloudflareBrowserScrapeNode);
      this.registerImplementation(CloudflareBrowserSnapshotNode);
    }

    if (this.hasTwilioSms) {
      this.registerImplementation(TwilioSmsNode);
    }

    if (this.hasSendgridEmail) {
      this.registerImplementation(SendgridEmailNode);
    }

    if (this.hasResendEmail) {
      this.registerImplementation(ResendEmailNode);
    }
  }

  public static initialize(env: Record<string, any>): void {
    if (!NodeRegistry.env) {
      NodeRegistry.env = env;
    }
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.env) {
      throw new Error(
        "NodeRegistry not initialized. Call NodeRegistry.initialize(env) first."
      );
    }
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry(NodeRegistry.env);
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
    return new Implementation(node, NodeRegistry.env);
  }

  public getNodeTypes(): NodeType[] {
    return Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );
  }
}
