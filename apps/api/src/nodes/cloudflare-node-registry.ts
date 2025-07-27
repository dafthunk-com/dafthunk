import { AudioRecorderNode } from "./audio/audio-recorder-node";
import { MelottsNode } from "./audio/melotts-node";
import { WhisperLargeV3TurboNode } from "./audio/whisper-large-v3-turbo-node";
import { WhisperNode } from "./audio/whisper-node";
import { WhisperTinyEnNode } from "./audio/whisper-tiny-en-node";
import { BaseNodeRegistry } from "./base-node-registry";
import { CloudflareBrowserContentNode } from "./browser/cloudflare-browser-content-node";
import { CloudflareBrowserJsonNode } from "./browser/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "./browser/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "./browser/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "./browser/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "./browser/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "./browser/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "./browser/cloudflare-browser-snapshot-node";
import { DocumentNode } from "./document/document-node";
import { ToMarkdownNode } from "./document/to-markdown-node";
import { ParseEmailNode } from "./email/parse-email-node";
import { ReceiveEmailNode } from "./email/receive-email-node";
import { SendEmailSendgridNode } from "./email/send-emai-sendgrid-node";
import { SendEmailResendNode } from "./email/send-email-resend-node";
import { SendEmailSesNode } from "./email/send-email-ses-node";
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
import { JsonExtractorNode } from "./json/json-extractor-node";
import { JsonJavascriptProcessorNode } from "./json/json-javascript-processor-node";
import { JsonNumberExtractorNode } from "./json/json-number-extractor-node";
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
import { HttpRequestNode } from "./net/http-request-node";
import { FormDataBooleanNode } from "./parameter/form-data-boolean-node";
import { FormDataNumberNode } from "./parameter/form-data-number-node";
import { FormDataStringNode } from "./parameter/form-data-string-node";
import { JsonBodyNode } from "./parameter/json-body-node";
import { RagAiSearchNode } from "./rag/rag-ai-search-node";
import { RagSearchNode } from "./rag/rag-search-node";
import { BartLargeCnnNode } from "./text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "./text/bge-reranker-base-node";
import { DeepseekR1DistillQwen32BNode } from "./text/deepseek-r1-distill-qwen-32b-node";
import { DistilbertSst2Int8Node } from "./text/distilbert-sst-2-int8-node";
import { InputTextNode } from "./text/input-text-node";
import { Llama318BInstructFastNode } from "./text/llama-3-1-8b-instruct-fast-node";
import { Llama3370BInstructFastNode } from "./text/llama-3-3-70b-instruct-fp8-fast-node";
import { M2m10012bNode } from "./text/m2m100-1-2b-node";
import { MultiVariableStringTemplateNode } from "./text/multi-variable-string-template-node";
import { RegexExtractNode } from "./text/regex-extract-node";
import { RegexMatchNode } from "./text/regex-match-node";
import { RegexReplaceNode } from "./text/regex-replace-node";
import { RegexSplitNode } from "./text/regex-split-node";
import { SingleVariableStringTemplateNode } from "./text/single-variable-string-template-node";
import { StringConcatNode } from "./text/string-concat-node";
import { StringIncludesNode } from "./text/string-includes-node";
import { StringIndexOfNode } from "./text/string-index-of-node";
import { StringLastIndexOfNode } from "./text/string-last-index-of-node";
import { StringNormalizeNode } from "./text/string-normalize-node";
import { StringSubstringNode } from "./text/string-substring-node";
import { StringToLowerCaseNode } from "./text/string-to-lower-case-node";
import { StringToUpperCaseNode } from "./text/string-to-upper-case-node";
import { StringTrimNode } from "./text/string-trim-node";
import { TextAreaNode } from "./text/text-area-node";
import { ToStringNode } from "./text/to-string-node";
import { TwilioSmsNode } from "./text/twilio-sms-node";
import { GeoJsonGeometryNode } from "./geo/geojson-geometry-node";
import { WktGeometryNode } from "./geo/wkt-geometry-node";
import { EnvelopeNode } from "./geo/envelope-node";
import { CentroidNode } from "./geo/centroid-node";
import { BufferNode } from "./geo/buffer-node";
import { AlongNode } from "./geo/along-node";
import { FeatureCollectionNode } from "./geo/feature-collection-node";
import { AreaNode } from "./geo/area-node";
import { BboxNode } from "./geo/bbox-node";
import { BboxPolygonNode } from "./geo/bbox-polygon-node";
import { BearingNode } from "./geo/bearing-node";
import { DistanceNode } from "./geo/distance-node";
import { PointNode } from "./geo/point-node";
import { LengthNode } from "./geo/length-node";
import { CenterNode } from "./geo/center-node";
import { DestinationNode } from "./geo/destination-node";
import { BooleanPointInPolygonNode } from "./geo/boolean-point-in-polygon-node";
import { CircleNode } from "./geo/circle-node";
import { UnionNode } from "./geo/union-node";
import { IntersectNode } from "./geo/intersect-node";
import { LineStringNode } from "./geo/linestring-node";
import { MidpointNode } from "./geo/midpoint-node";
import { PolygonNode } from "./geo/polygon-node";
import { SimplifyNode } from "./geo/simplify-node";
import { ConvexNode } from "./geo/convex-node";
import { AngleNode } from "./geo/angle-node";
import { NearestPointNode } from "./geo/nearest-point-node";
import { ExplodeNode } from "./geo/explode-node";
import { FlipNode } from "./geo/flip-node";
import { BooleanContainsNode } from "./geo/boolean-contains-node";
import { TransformRotateNode } from "./geo/transform-rotate-node";
import { CombineNode } from "./geo/combine-node";
import { RhumbBearingNode } from "./geo/rhumb-bearing-node";
import { RhumbDistanceNode } from "./geo/rhumb-distance-node";
import { TransformTranslateNode } from "./geo/transform-translate-node";
import { TransformScaleNode } from "./geo/transform-scale-node";
import { RhumbDestinationNode } from "./geo/rhumb-destination-node";
import { BooleanOverlapNode } from "./geo/boolean-overlap-node";
import { BooleanDisjointNode } from "./geo/boolean-disjoint-node";
import { CenterOfMassNode } from "./geo/center-of-mass-node";
import { DifferenceNode } from "./geo/difference-node";
import { LineIntersectNode } from "./geo/line-intersect-node";
import { LineOverlapNode } from "./geo/line-overlap-node";
import { LineSegmentNode } from "./geo/line-segment-node";
import { LineSliceNode } from "./geo/line-slice-node";
import { LineSliceAlongNode } from "./geo/line-slice-along-node";
import { LineSplitNode } from "./geo/line-split-node";
import { MaskNode } from "./geo/mask-node";
import { NearestPointOnLineNode } from "./geo/nearest-point-on-line-node";
import { SectorNode } from "./geo/sector-node";
import { ShortestPathNode } from "./geo/shortest-path-node";
import { GreatCircleNode } from "./geo/great-circle-node";
import { PointOnFeatureNode } from "./geo/point-on-feature-node";
import { PointToLineDistanceNode } from "./geo/point-to-line-distance-node";
import { PointToPolygonDistanceNode } from "./geo/point-to-polygon-distance-node";
import { PolygonTangentsNode } from "./geo/polygon-tangents-node";
import { SquareNode } from "./geo/square-node";
import { CleanCoordsNode } from "./geo/clean-coords-node";
import { RewindNode } from "./geo/rewind-node";
import { RoundNode } from "./geo/round-node";
import { TruncateNode } from "./geo/truncate-node";
import { BboxClipNode } from "./geo/bbox-clip-node";
import { ConcaveNode } from "./geo/concave-node";
import { LineOffsetNode } from "./geo/line-offset-node";
import { PolygonSmoothNode } from "./geo/polygon-smooth-node";
import { VoronoiNode } from "./geo/voronoi-node";
import { FlattenNode } from "./geo/flatten-node";
import { LineToPolygonNode } from "./geo/line-to-polygon-node";
import { PolygonToLineNode } from "./geo/polygon-to-line-node";
import { PolygonizeNode } from "./geo/polygonize-node";
import { KinksNode } from "./geo/kinks-node";
import { LineArcNode } from "./geo/line-arc-node";
import { LineChunkNode } from "./geo/line-chunk-node";
import { AvgNode } from "./math/avg-node";
import { MinNode } from "./math/min-node";
import { MaxNode } from "./math/max-node";
import { MedianNode } from "./math/median-node";
import { SumNode } from "./math/sum-node";

export class CloudflareNodeRegistry extends BaseNodeRegistry {
  protected registerNodes(): void {
    // Initialize environment feature flags as local variables
    const hasCloudflare = !!(
      this.env.CLOUDFLARE_ACCOUNT_ID && this.env.CLOUDFLARE_API_TOKEN
    );
    const hasTwilioSms = !!(
      this.env.TWILIO_ACCOUNT_SID &&
      this.env.TWILIO_AUTH_TOKEN &&
      this.env.TWILIO_PHONE_NUMBER
    );
    const hasSendgridEmail = !!(
      this.env.SENDGRID_API_KEY && this.env.SENDGRID_DEFAULT_FROM
    );
    const hasResendEmail = !!(
      this.env.RESEND_API_KEY && this.env.RESEND_DEFAULT_FROM
    );
    const hasSESEmail = !!(
      this.env.AWS_ACCESS_KEY_ID &&
      this.env.AWS_SECRET_ACCESS_KEY &&
      this.env.AWS_REGION &&
      this.env.SES_DEFAULT_FROM
    );

    // Register all core nodes
    this.registerImplementation(FormDataStringNode);
    this.registerImplementation(FormDataNumberNode);
    this.registerImplementation(FormDataBooleanNode);
    this.registerImplementation(JsonBodyNode);
    this.registerImplementation(ReceiveEmailNode);
    this.registerImplementation(ParseEmailNode);
    this.registerImplementation(AdditionNode);
    this.registerImplementation(SubtractionNode);
    this.registerImplementation(MultiplicationNode);
    this.registerImplementation(DivisionNode);
    this.registerImplementation(ModuloNode);
    this.registerImplementation(ExponentiationNode);
    this.registerImplementation(SquareRootNode);
    this.registerImplementation(AbsoluteValueNode);
    this.registerImplementation(SumNode);
    this.registerImplementation(MaxNode);
    this.registerImplementation(MinNode);
    this.registerImplementation(AvgNode);
    this.registerImplementation(MedianNode);
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
    this.registerImplementation(JsonExtractorNode);
    this.registerImplementation(JsonJavascriptProcessorNode);
    this.registerImplementation(JsonTemplateNode);
    this.registerImplementation(JsonEditorNode);
    this.registerImplementation(MultiVariableStringTemplateNode);
    this.registerImplementation(SingleVariableStringTemplateNode);
    this.registerImplementation(JavaScriptEditorNode);
    this.registerImplementation(LLaVA157BHFNode);
    this.registerImplementation(CanvasDoodleNode);
    this.registerImplementation(StableDiffusionXLBase10Node);
    this.registerImplementation(Flux1SchnellNode);
    this.registerImplementation(DreamShaper8LCMNode);
    this.registerImplementation(ExifReaderNode);
    this.registerImplementation(MelottsNode);
    this.registerImplementation(WebcamNode);

    // String operations
    this.registerImplementation(StringConcatNode);
    this.registerImplementation(StringIncludesNode);
    this.registerImplementation(StringIndexOfNode);
    this.registerImplementation(StringLastIndexOfNode);
    this.registerImplementation(StringNormalizeNode);
    this.registerImplementation(StringSubstringNode);
    this.registerImplementation(StringToLowerCaseNode);
    this.registerImplementation(StringToUpperCaseNode);
    this.registerImplementation(StringTrimNode);
    this.registerImplementation(RegexMatchNode);
    this.registerImplementation(RegexExtractNode);
    this.registerImplementation(RegexReplaceNode);
    this.registerImplementation(RegexSplitNode);
    this.registerImplementation(ConditionalForkNode);
    this.registerImplementation(ConditionalJoinNode);

    // Image operations
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
    this.registerImplementation(GeoJsonGeometryNode);
    this.registerImplementation(WktGeometryNode);
    this.registerImplementation(EnvelopeNode);
    this.registerImplementation(BufferNode);
    this.registerImplementation(CentroidNode);
    this.registerImplementation(AlongNode);
    this.registerImplementation(FeatureCollectionNode);
    this.registerImplementation(AreaNode);
    this.registerImplementation(BboxNode);
    this.registerImplementation(BboxPolygonNode);
    this.registerImplementation(BearingNode);
    this.registerImplementation(DistanceNode);
    this.registerImplementation(PointNode);
    this.registerImplementation(LengthNode);
    this.registerImplementation(CenterNode);
    this.registerImplementation(DestinationNode);
    this.registerImplementation(BooleanPointInPolygonNode);
    this.registerImplementation(CircleNode);
    this.registerImplementation(UnionNode);
    this.registerImplementation(IntersectNode);
    this.registerImplementation(LineStringNode);
    this.registerImplementation(MidpointNode);
    this.registerImplementation(PolygonNode);
    this.registerImplementation(SimplifyNode);
    this.registerImplementation(ConvexNode);
    this.registerImplementation(AngleNode);
    this.registerImplementation(NearestPointNode);
    this.registerImplementation(ExplodeNode);
    this.registerImplementation(FlipNode);
    this.registerImplementation(BooleanContainsNode);
    this.registerImplementation(TransformRotateNode);
    this.registerImplementation(CombineNode);
    this.registerImplementation(RhumbBearingNode);
    this.registerImplementation(RhumbDistanceNode);
    this.registerImplementation(TransformTranslateNode);
    this.registerImplementation(TransformScaleNode);
    this.registerImplementation(RhumbDestinationNode);
    this.registerImplementation(BooleanOverlapNode);
    this.registerImplementation(BooleanDisjointNode);
    this.registerImplementation(CenterOfMassNode);
    this.registerImplementation(DifferenceNode);
    this.registerImplementation(LineIntersectNode);
    this.registerImplementation(GreatCircleNode);
    this.registerImplementation(PointOnFeatureNode);
    this.registerImplementation(PointToLineDistanceNode);
    this.registerImplementation(PointToPolygonDistanceNode);
    this.registerImplementation(PolygonTangentsNode);
    this.registerImplementation(SquareNode);
    this.registerImplementation(CleanCoordsNode);
    this.registerImplementation(RewindNode);
    this.registerImplementation(RoundNode);
    this.registerImplementation(TruncateNode);
    this.registerImplementation(BboxClipNode);
    this.registerImplementation(ConcaveNode);
    this.registerImplementation(LineOffsetNode);
    this.registerImplementation(PolygonSmoothNode);
    this.registerImplementation(VoronoiNode);
    this.registerImplementation(FlattenNode);
    this.registerImplementation(LineToPolygonNode);
    this.registerImplementation(PolygonToLineNode);
    this.registerImplementation(PolygonizeNode);
    this.registerImplementation(KinksNode);
    this.registerImplementation(LineArcNode);
    this.registerImplementation(LineChunkNode);
    this.registerImplementation(LineIntersectNode);
    this.registerImplementation(LineOverlapNode);
    this.registerImplementation(LineSegmentNode);
    this.registerImplementation(LineSliceNode);
    this.registerImplementation(LineSliceAlongNode);
    this.registerImplementation(LineSplitNode);
    this.registerImplementation(MaskNode);
    this.registerImplementation(NearestPointOnLineNode);
    this.registerImplementation(SectorNode);
    this.registerImplementation(ShortestPathNode);

    // Conditional registrations based on environment
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

    if (hasTwilioSms) {
      this.registerImplementation(TwilioSmsNode);
    }

    if (hasSESEmail) {
      this.registerImplementation(SendEmailSesNode);
    }

    if (hasSendgridEmail) {
      this.registerImplementation(SendEmailSendgridNode);
    }

    if (hasResendEmail) {
      this.registerImplementation(SendEmailResendNode);
    }

    if (this.developerMode) {
      this.registerImplementation(RagAiSearchNode);
      this.registerImplementation(RagSearchNode);
    }
  }
}
