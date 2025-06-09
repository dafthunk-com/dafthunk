import { Node, WorkflowType } from "@dafthunk/types";
import { NodeType } from "@dafthunk/types";

import { AudioRecorderNode } from "./audio/audio-recorder-node";
import { MelottsNode } from "./audio/melotts-node";
import { WhisperLargeV3TurboNode } from "./audio/whisper-large-v3-turbo-node";
import { WhisperNode } from "./audio/whisper-node";
import { WhisperTinyEnNode } from "./audio/whisper-tiny-en-node";
import { DocumentNode } from "./document/document-node";
import { ToMarkdownNode } from "./document/to-markdown-node";
import { EmailParametersNode } from "./email/email-parameters-node";
import { EmailParserNode } from "./email/email-parser-node";
import { ResendEmailNode } from "./email/resend-email-node";
import { SendgridEmailNode } from "./email/sendgrid-email-node";
import { SESEmailNode } from "./email/ses-email-node";
import { CanvasDoodleNode } from "./image/canvas-doodle-node";
import { DetrResnet50Node } from "./image/detr-resnet50-node";
import { DreamShaper8LCMNode } from "./image/dream-shaper8-lcm-node";
import { ExifReaderNode } from "./image/exif-reader-node";
import { Flux1SchnellNode } from "./image/flux-1-schnell-node";
import { ImageUrlLoaderNode } from "./image/image-url-loader-node";
import { LLaVA157BHFNode } from "./image/llava1-5-7b-hf-node";
import { PhotonAddNoiseNode } from "./image/photon-add-noise-node";
import { PhotonAdjustBrightnessNode } from "./image/photon-adjust-brightness-node";
import { PhotonAdjustContrastNode } from "./image/photon-adjust-contrast-node";
import { PhotonAdjustHslLightnessNode } from "./image/photon-adjust-hsl-lightness-node";
import { PhotonAdjustHueNode } from "./image/photon-adjust-hue-node";
import { PhotonAdjustSaturationNode } from "./image/photon-adjust-saturation-node";
import { PhotonAlterRGBChannelsNode } from "./image/photon-alter-rgb-channels-node";
import { PhotonApplyFilterNode } from "./image/photon-apply-filter-node";
import { PhotonBlendImagesNode } from "./image/photon-blend-images-node";
import { PhotonCropNode } from "./image/photon-crop-node";
import { PhotonEdgeDetectionNode } from "./image/photon-edge-detection-node";
import { PhotonEmbossNode } from "./image/photon-emboss-node";
import { PhotonFlipImageNode } from "./image/photon-flip-image-node";
import { PhotonGaussianBlurNode } from "./image/photon-gaussian-blur-node";
import { PhotonGrayscaleNode } from "./image/photon-grayscale-node";
import { PhotonImageInfoNode } from "./image/photon-image-info-node";
import { PhotonInvertColorsNode } from "./image/photon-invert-colors-node";
import { PhotonMixWithColorNode } from "./image/photon-mix-with-color-node";
import { PhotonOilPaintingNode } from "./image/photon-oil-painting-node";
import { PhotonPixelizeNode } from "./image/photon-pixelize-node";
import { PhotonResizeNode } from "./image/photon-resize-node";
import { PhotonRotateImageNode } from "./image/photon-rotate-image-node";
import { PhotonSepiaNode } from "./image/photon-sepia-node";
import { PhotonSharpenNode } from "./image/photon-sharpen-node";
import { PhotonThresholdNode } from "./image/photon-threshold-node";
import { PhotonWatermarkNode } from "./image/photon-watermark-node";
import { Resnet50Node } from "./image/resnet-50-node";
import { StableDiffusionV15Img2ImgNode } from "./image/stable-diffusion-v1-5-img2-img-node";
import { StableDiffusionV15InpaintingNode } from "./image/stable-diffusion-v1-5-inpainting-node";
import { StableDiffusionXLBase10Node } from "./image/stable-diffusion-xl-base-1-0-node";
import { StableDiffusionXLLightningNode } from "./image/stable-diffusion-xl-lightning-node";
import { UformGen2Qwen500mNode } from "./image/uform-gen2-qwen-500m-node";
import { WebcamNode } from "./image/webcam-node";
import { JavaScriptEditorNode } from "./javascript/javascript-editor-node";
import { JsonBooleanExtractorNode } from "./json/json-boolean-extractor-node";
import { JsonEditorNode } from "./json/json-editor-node";
import { JsonJavascriptProcessorNode } from "./json/json-javascript-processor-node";
import { JsonNumberExtractorNode } from "./json/json-number-extractor-node";
import { JsonObjectArrayExtractorNode } from "./json/json-object-array-extractor-node";
import { JsonStringExtractorNode } from "./json/json-string-extractor-node";
import { JsonTemplateNode } from "./json/json-template-node";
import { ConditionalForkNode } from "./logic/conditional-fork-node";
import { ConditionalJoinNode } from "./logic/conditional-join-node";
import { AbsoluteValueNode } from "./math/absolute-value-node";
import { AdditionNode } from "./math/addition-node";
import { DivisionNode } from "./math/division-node";
import { ExponentiationNode } from "./math/exponentiation-node";
import { ModuloNode } from "./math/modulo-node";
import { MultiplicationNode } from "./math/multiplication-node";
import { NumberInputNode } from "./math/number-input-node";
import { SliderNode } from "./math/slider-node";
import { SquareRootNode } from "./math/square-root-node";
import { SubtractionNode } from "./math/subtraction-node";
import { CloudflareBrowserContentNode } from "./net/cloudflare-browser-content-node";
import { CloudflareBrowserJsonNode } from "./net/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "./net/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "./net/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "./net/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "./net/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "./net/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "./net/cloudflare-browser-snapshot-node";
import { HttpRequestNode } from "./net/http-request-node";
import { FormDataBooleanNode } from "./parameter/form-data-boolean-node";
import { FormDataNumberNode } from "./parameter/form-data-number-node";
import { FormDataStringNode } from "./parameter/form-data-string-node";
import { JsonBodyNode } from "./parameter/json-body-node";
import { BartLargeCnnNode } from "./text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "./text/bge-reranker-base-node";
import { DeepseekR1DistillQwen32BNode } from "./text/deepseek-r1-distill-qwen-32b-node";
import { DistilbertSst2Int8Node } from "./text/distilbert-sst-2-int8-node";
import { InputTextNode } from "./text/input-text-node";
import { Llama318BInstructFastNode } from "./text/llama-3-1-8b-instruct-fast-node";
import { Llama3370BInstructFastNode } from "./text/llama-3-3-70b-instruct-fp8-fast-node";
import { M2m10012bNode } from "./text/m2m100-1-2b-node";
import { TextAreaNode } from "./text/text-area-node";
import { ToStringNode } from "./text/to-string-node";
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
  private hasSESEmail: boolean = false;

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
    this.hasSESEmail = !!(
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.AWS_REGION &&
      env.SES_DEFAULT_FROM
    );

    this.registerImplementation(FormDataStringNode);
    this.registerImplementation(FormDataNumberNode);
    this.registerImplementation(FormDataBooleanNode);
    this.registerImplementation(JsonBodyNode);
    this.registerImplementation(EmailParametersNode);
    this.registerImplementation(EmailParserNode);
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
    this.registerImplementation(ModuloNode);
    this.registerImplementation(ExponentiationNode);
    this.registerImplementation(SquareRootNode);
    this.registerImplementation(AbsoluteValueNode);
    this.registerImplementation(TextAreaNode);
    this.registerImplementation(InputTextNode);
    this.registerImplementation(ToStringNode);
    this.registerImplementation(NumberInputNode);
    this.registerImplementation(SliderNode);
    this.registerImplementation(Llama318BInstructFastNode);
    this.registerImplementation(Llama3370BInstructFastNode);
    this.registerImplementation(DeepseekR1DistillQwen32BNode);
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
    this.registerImplementation(JsonJavascriptProcessorNode);
    this.registerImplementation(JsonTemplateNode);
    this.registerImplementation(JsonEditorNode);
    this.registerImplementation(JavaScriptEditorNode);
    this.registerImplementation(LLaVA157BHFNode);
    this.registerImplementation(CanvasDoodleNode);
    this.registerImplementation(StableDiffusionXLBase10Node);
    this.registerImplementation(Flux1SchnellNode);
    this.registerImplementation(DreamShaper8LCMNode);
    this.registerImplementation(ExifReaderNode);
    this.registerImplementation(MelottsNode);
    this.registerImplementation(WebcamNode);
    this.registerImplementation(ConditionalForkNode);
    this.registerImplementation(ConditionalJoinNode);

    this.registerImplementation(PhotonAddNoiseNode);
    this.registerImplementation(PhotonAdjustBrightnessNode);
    this.registerImplementation(PhotonAdjustContrastNode);
    this.registerImplementation(PhotonAdjustHslLightnessNode);
    this.registerImplementation(PhotonAdjustHueNode);
    this.registerImplementation(PhotonAdjustSaturationNode);
    this.registerImplementation(PhotonAlterRGBChannelsNode);
    this.registerImplementation(PhotonApplyFilterNode);
    this.registerImplementation(PhotonBlendImagesNode);
    this.registerImplementation(PhotonCropNode);
    this.registerImplementation(PhotonEdgeDetectionNode);
    this.registerImplementation(PhotonEmbossNode);
    this.registerImplementation(PhotonFlipImageNode);
    this.registerImplementation(PhotonGaussianBlurNode);
    this.registerImplementation(PhotonGrayscaleNode);
    this.registerImplementation(PhotonImageInfoNode);
    this.registerImplementation(PhotonInvertColorsNode);
    this.registerImplementation(PhotonMixWithColorNode);
    this.registerImplementation(PhotonOilPaintingNode);
    this.registerImplementation(PhotonPixelizeNode);
    this.registerImplementation(PhotonResizeNode);
    this.registerImplementation(PhotonRotateImageNode);
    this.registerImplementation(PhotonSepiaNode);
    this.registerImplementation(PhotonSharpenNode);
    this.registerImplementation(PhotonThresholdNode);
    this.registerImplementation(PhotonWatermarkNode);

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

    if (this.hasSESEmail) {
      this.registerImplementation(SESEmailNode);
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

  public getNodeTypes(workflowType?: WorkflowType): NodeType[] {
    const nodeTypes = Array.from(this.implementations.values()).map(
      (implementation) => implementation.nodeType
    );

    if (!workflowType) {
      return nodeTypes;
    }

    return nodeTypes.filter(
      (nodeType) =>
        !nodeType.compatibility || nodeType.compatibility.includes(workflowType)
    );
  }
}
