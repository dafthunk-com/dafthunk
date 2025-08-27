import { BufferGeometryToGltfNode } from "./3d/buffergeometry-to-gltf-node";
import { DemToBufferGeometryNode } from "./3d/dem-to-buffergeometry-node";
import { GeoTiffDemQueryNode } from "./3d/geotiff-dem-query-node";
import { GeoTiffMetadataReaderNode } from "./3d/geotiff-metadata-reader-node";
import { GeoTiffQueryNode } from "./3d/geotiff-query-node";
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
import { AddDateNode } from "./date/add-date-node";
import { DiffDateNode } from "./date/diff-date-node";
import { NowDateNode } from "./date/now-date-node";
import { ParseDateNode } from "./date/parse-date-node";
import { DocumentNode } from "./document/document-node";
import { ToMarkdownNode } from "./document/to-markdown-node";
import { ParseEmailNode } from "./email/parse-email-node";
import { ReceiveEmailNode } from "./email/receive-email-node";
import { SendEmailSendgridNode } from "./email/send-emai-sendgrid-node";
import { SendEmailResendNode } from "./email/send-email-resend-node";
import { SendEmailSesNode } from "./email/send-email-ses-node";
import { AlongNode } from "./geo/along-node";
import { AngleNode } from "./geo/angle-node";
import { AreaNode } from "./geo/area-node";
import { BboxClipNode } from "./geo/bbox-clip-node";
import { BboxNode } from "./geo/bbox-node";
import { BboxPolygonNode } from "./geo/bbox-polygon-node";
import { BearingNode } from "./geo/bearing-node";
import { BooleanClockwiseNode } from "./geo/boolean-clockwise-node";
import { BooleanConcaveNode } from "./geo/boolean-concave-node";
import { BooleanContainsNode } from "./geo/boolean-contains-node";
import { BooleanCrossesNode } from "./geo/boolean-crosses-node";
import { BooleanDisjointNode } from "./geo/boolean-disjoint-node";
import { BooleanEqualNode } from "./geo/boolean-equal-node";
import { BooleanIntersectsNode } from "./geo/boolean-intersects-node";
import { BooleanOverlapNode } from "./geo/boolean-overlap-node";
import { BooleanParallelNode } from "./geo/boolean-parallel-node";
import { BooleanPointInPolygonNode } from "./geo/boolean-point-in-polygon-node";
import { BooleanPointOnLineNode } from "./geo/boolean-point-on-line-node";
import { BooleanTouchesNode } from "./geo/boolean-touches-node";
import { BooleanValidNode } from "./geo/boolean-valid-node";
import { BooleanWithinNode } from "./geo/boolean-within-node";
import { BufferNode } from "./geo/buffer-node";
import { CenterMeanNode } from "./geo/center-mean-node";
import { CenterMedianNode } from "./geo/center-median-node";
import { CenterNode } from "./geo/center-node";
import { CenterOfMassNode } from "./geo/center-of-mass-node";
import { CentroidNode } from "./geo/centroid-node";
import { CircleNode } from "./geo/circle-node";
import { CleanCoordsNode } from "./geo/clean-coords-node";
import { CombineNode } from "./geo/combine-node";
import { ConcaveNode } from "./geo/concave-node";
import { ConvexNode } from "./geo/convex-node";
import { DestinationNode } from "./geo/destination-node";
import { DifferenceNode } from "./geo/difference-node";
import { DistanceNode } from "./geo/distance-node";
import { EnvelopeNode } from "./geo/envelope-node";
import { ExplodeNode } from "./geo/explode-node";
import { FeatureCollectionNode } from "./geo/feature-collection-node";
import { FeatureNode } from "./geo/feature-node";
import { FlattenNode } from "./geo/flatten-node";
import { FlipNode } from "./geo/flip-node";
import { GeoJsonNode } from "./geo/geojson-node";
import { GeoJsonToSvgNode } from "./geo/geojson-to-svg-node";
import { GeometryCollectionNode } from "./geo/geometry-collection-node";
import { GreatCircleNode } from "./geo/great-circle-node";
import { IntersectNode } from "./geo/intersect-node";
import { KinksNode } from "./geo/kinks-node";
import { LengthNode } from "./geo/length-node";
import { LineArcNode } from "./geo/line-arc-node";
import { LineChunkNode } from "./geo/line-chunk-node";
import { LineIntersectNode } from "./geo/line-intersect-node";
import { LineOffsetNode } from "./geo/line-offset-node";
import { LineOverlapNode } from "./geo/line-overlap-node";
import { LineSegmentNode } from "./geo/line-segment-node";
import { LineSliceAlongNode } from "./geo/line-slice-along-node";
import { LineSliceNode } from "./geo/line-slice-node";
import { LineSplitNode } from "./geo/line-split-node";
import { LineToPolygonNode } from "./geo/line-to-polygon-node";
import { LineStringNode } from "./geo/linestring-node";
import { MaskNode } from "./geo/mask-node";
import { MidpointNode } from "./geo/midpoint-node";
import { MultiLineStringNode } from "./geo/multilinestring-node";
import { MultiPointNode } from "./geo/multipoint-node";
import { MultiPolygonNode } from "./geo/multipolygon-node";
import { NearestPointNode } from "./geo/nearest-point-node";
import { NearestPointOnLineNode } from "./geo/nearest-point-on-line-node";
import { PointNode } from "./geo/point-node";
import { PointOnFeatureNode } from "./geo/point-on-feature-node";
import { PointToLineDistanceNode } from "./geo/point-to-line-distance-node";
import { PointToPolygonDistanceNode } from "./geo/point-to-polygon-distance-node";
import { PolygonNode } from "./geo/polygon-node";
import { PolygonSmoothNode } from "./geo/polygon-smooth-node";
import { PolygonTangentsNode } from "./geo/polygon-tangents-node";
import { PolygonToLineNode } from "./geo/polygon-to-line-node";
import { PolygonizeNode } from "./geo/polygonize-node";
import { RewindNode } from "./geo/rewind-node";
import { RhumbBearingNode } from "./geo/rhumb-bearing-node";
import { RhumbDestinationNode } from "./geo/rhumb-destination-node";
import { RhumbDistanceNode } from "./geo/rhumb-distance-node";
import { RoundNode } from "./geo/round-node";
import { SectorNode } from "./geo/sector-node";
import { ShortestPathNode } from "./geo/shortest-path-node";
import { SimplifyNode } from "./geo/simplify-node";
import { SquareNode } from "./geo/square-node";
import { TransformRotateNode } from "./geo/transform-rotate-node";
import { TransformScaleNode } from "./geo/transform-scale-node";
import { TransformTranslateNode } from "./geo/transform-translate-node";
import { TruncateNode } from "./geo/truncate-node";
import { UnionNode } from "./geo/union-node";
import { UnkinkPolygonNode } from "./geo/unkink-polygon-node";
import { VoronoiNode } from "./geo/voronoi-node";
import { WktGeometryNode } from "./geo/wkt-geometry-node";
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
import { SvgToPngNode } from "./image/svg-to-png-node";
import { UformGen2Qwen500mNode } from "./image/uform-gen2-qwen-500m-node";
import { WebcamNode } from "./image/webcam-node";
import { JavaScriptEditorNode } from "./javascript/javascript-editor-node";
import { JavascriptScriptNode } from "./javascript/javascript-script-node";
import { JsonAggNode } from "./json/json-agg-node";
import { JsonArrayLengthNode } from "./json/json-array-length-node";
import { JsonContainsNode } from "./json/json-contains-node";
import { JsonContainsPathNode } from "./json/json-contains-path-node";
import { JsonEditorNode } from "./json/json-editor-node";
import { JsonExecuteJavascriptNode } from "./json/json-execute-javascript-node";
import { JsonExtractAllNode } from "./json/json-extract-all-node";
import { JsonExtractBooleanNode } from "./json/json-extract-boolean-node";
import { JsonExtractNumberNode } from "./json/json-extract-number-node";
import { JsonExtractObjectNode } from "./json/json-extract-object-node";
import { JsonExtractStringNode } from "./json/json-extract-string-node";
import { JsonFlattenNode } from "./json/json-flatten-node";
import { JsonInsertNode } from "./json/json-insert-node";
import { JsonKeysNode } from "./json/json-keys-node";
import { JsonMergeNode } from "./json/json-merge-node";
import { JsonObjectAggNode } from "./json/json-object-agg-node";
import { JsonObjectKeysNode } from "./json/json-object-keys-node";
import { JsonObjectValuesNode } from "./json/json-object-values-node";
import { JsonRemoveNode } from "./json/json-remove-node";
import { JsonReplaceNode } from "./json/json-replace-node";
import { JsonSetNode } from "./json/json-set-node";
import { JsonStripNullsNode } from "./json/json-strip-nulls-node";
import { JsonTemplateNode } from "./json/json-template-node";
import { JsonToGeojsonNode } from "./json/json-to-geojson-node";
import { JsonTypeofNode } from "./json/json-typeof-node";
import { JsonValidNode } from "./json/json-valid-node";
import { ConditionalForkNode } from "./logic/conditional-fork-node";
import { ConditionalJoinNode } from "./logic/conditional-join-node";
import { AbsoluteValueNode } from "./math/absolute-value-node";
import { AdditionNode } from "./math/addition-node";
import { AvgNode } from "./math/avg-node";
import { CalculatorNode } from "./math/calculator-node";
import { DivisionNode } from "./math/division-node";
import { ExponentiationNode } from "./math/exponentiation-node";
import { MaxNode } from "./math/max-node";
import { MedianNode } from "./math/median-node";
import { MinNode } from "./math/min-node";
import { ModuloNode } from "./math/modulo-node";
import { MultiplicationNode } from "./math/multiplication-node";
import { NumberInputNode } from "./math/number-input-node";
import { SliderNode } from "./math/slider-node";
import { SquareRootNode } from "./math/square-root-node";
import { SubtractionNode } from "./math/subtraction-node";
import { SumNode } from "./math/sum-node";
import { HttpRequestNode } from "./net/http-request-node";
import { FormDataBooleanNode } from "./parameter/form-data-boolean-node";
import { FormDataNumberNode } from "./parameter/form-data-number-node";
import { FormDataStringNode } from "./parameter/form-data-string-node";
import { JsonBodyNode } from "./parameter/json-body-node";
import { RagAiSearchNode } from "./rag/rag-ai-search-node";
import { RagSearchNode } from "./rag/rag-search-node";
import { BartLargeCnnNode } from "./text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "./text/bge-reranker-base-node";
import { Claude3OpusNode } from "./text/claude-3-opus-node";
import { Claude35HaikuNode } from "./text/claude-35-haiku-node";
import { Claude35SonnetNode } from "./text/claude-35-sonnet-node";
import { Claude37SonnetNode } from "./text/claude-37-sonnet-node";
import { ClaudeOpus4Node } from "./text/claude-opus-4-node";
import { ClaudeOpus41Node } from "./text/claude-opus-41-node";
import { ClaudeSonnet4Node } from "./text/claude-sonnet-4-node";
import { DeepseekR1DistillQwen32BNode } from "./text/deepseek-r1-distill-qwen-32b-node";
import { DistilbertSst2Int8Node } from "./text/distilbert-sst-2-int8-node";
import { Gpt5MiniNode } from "./text/gpt-5-mini-node";
import { Gpt5NanoNode } from "./text/gpt-5-nano-node";
import { Gpt5Node } from "./text/gpt-5-node";
import { Gpt41Node } from "./text/gpt-41-node";
import { GptOss20BNode } from "./text/gpt-oss-20b-node";
import { GptOss120BNode } from "./text/gpt-oss-120b-node";
import { Hermes2ProMistral7BNode } from "./text/hermes-2-pro-mistral-7b-node";
import { InputTextNode } from "./text/input-text-node";
import { Llama318BInstructFastNode } from "./text/llama-3-1-8b-instruct-fast-node";
import { Llama3370BInstructFastNode } from "./text/llama-3-3-70b-instruct-fp8-fast-node";
import { Llama4Scout17B16EInstructNode } from "./text/llama-4-scout-17b-16e-instruct-node";
import { M2m10012bNode } from "./text/m2m100-1-2b-node";
import { MistralSmall31_24BInstructNode } from "./text/mistral-small-3-1-24b-instruct-node";
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
import { ToJsonNode } from "./text/to-json-node";
import { ToStringNode } from "./text/to-string-node";
import { TwilioSmsNode } from "./text/twilio-sms-node";

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
    const hasOpenAI = !!this.env.OPENAI_API_KEY;
    const hasAnthropic = !!this.env.ANTHROPIC_API_KEY;

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
    this.registerImplementation(CalculatorNode);
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
    this.registerImplementation(GptOss120BNode);
    this.registerImplementation(GptOss20BNode);
    this.registerImplementation(DeepseekR1DistillQwen32BNode);
    this.registerImplementation(Hermes2ProMistral7BNode);
    this.registerImplementation(Llama4Scout17B16EInstructNode);
    this.registerImplementation(MistralSmall31_24BInstructNode);
    this.registerImplementation(Hermes2ProMistral7BNode);
    this.registerImplementation(Llama4Scout17B16EInstructNode);
    this.registerImplementation(MistralSmall31_24BInstructNode);
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
    this.registerImplementation(JsonAggNode);
    this.registerImplementation(JsonExtractStringNode);
    this.registerImplementation(JsonExtractBooleanNode);
    this.registerImplementation(JsonExtractNumberNode);
    this.registerImplementation(JsonExtractObjectNode);
    this.registerImplementation(JsonExtractAllNode);
    this.registerImplementation(JsonExecuteJavascriptNode);
    this.registerImplementation(JsonTemplateNode);
    this.registerImplementation(JsonEditorNode);
    // Date nodes
    this.registerImplementation(NowDateNode);
    this.registerImplementation(ParseDateNode);
    this.registerImplementation(AddDateNode);
    this.registerImplementation(DiffDateNode);
    this.registerImplementation(JsonArrayLengthNode);
    this.registerImplementation(JsonContainsNode);
    this.registerImplementation(JsonContainsPathNode);
    this.registerImplementation(JsonFlattenNode);
    this.registerImplementation(JsonInsertNode);
    this.registerImplementation(JsonKeysNode);
    this.registerImplementation(JsonMergeNode);
    this.registerImplementation(JsonObjectAggNode);
    this.registerImplementation(JsonObjectKeysNode);
    this.registerImplementation(JsonObjectValuesNode);
    this.registerImplementation(JsonRemoveNode);
    this.registerImplementation(JsonReplaceNode);
    this.registerImplementation(JsonSetNode);
    this.registerImplementation(JsonStripNullsNode);
    this.registerImplementation(JsonToGeojsonNode);
    this.registerImplementation(JsonTypeofNode);
    this.registerImplementation(JsonValidNode);
    this.registerImplementation(MultiVariableStringTemplateNode);
    this.registerImplementation(SingleVariableStringTemplateNode);
    this.registerImplementation(JavaScriptEditorNode);
    this.registerImplementation(JavascriptScriptNode);
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
    this.registerImplementation(ToJsonNode);
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

    // RAG nodes
    if (this.developerMode) {
      this.registerImplementation(RagAiSearchNode);
      this.registerImplementation(RagSearchNode);
    }

    // 3D Tiles workflow nodes
    if (this.developerMode) {
      this.registerImplementation(BufferGeometryToGltfNode);
      this.registerImplementation(DemToBufferGeometryNode);
      this.registerImplementation(GeoTiffDemQueryNode);
      this.registerImplementation(GeoTiffMetadataReaderNode);
      this.registerImplementation(GeoTiffQueryNode);
    }

    // Geo nodes
    if (this.developerMode) {
      this.registerImplementation(AlongNode);
      this.registerImplementation(AngleNode);
      this.registerImplementation(AreaNode);
      this.registerImplementation(BboxClipNode);
      this.registerImplementation(BboxNode);
      this.registerImplementation(BboxPolygonNode);
      this.registerImplementation(BearingNode);
      this.registerImplementation(BooleanClockwiseNode);
      this.registerImplementation(BooleanConcaveNode);
      this.registerImplementation(BooleanContainsNode);
      this.registerImplementation(BooleanCrossesNode);
      this.registerImplementation(BooleanDisjointNode);
      this.registerImplementation(BooleanEqualNode);
      this.registerImplementation(BooleanIntersectsNode);
      this.registerImplementation(BooleanOverlapNode);
      this.registerImplementation(BooleanParallelNode);
      this.registerImplementation(BooleanPointInPolygonNode);
      this.registerImplementation(BooleanPointOnLineNode);
      this.registerImplementation(BooleanTouchesNode);
      this.registerImplementation(BooleanValidNode);
      this.registerImplementation(BooleanWithinNode);
      this.registerImplementation(BufferNode);
      this.registerImplementation(CenterMeanNode);
      this.registerImplementation(CenterMedianNode);
      this.registerImplementation(CenterNode);
      this.registerImplementation(CenterOfMassNode);
      this.registerImplementation(CentroidNode);
      this.registerImplementation(CircleNode);
      this.registerImplementation(CleanCoordsNode);
      this.registerImplementation(CombineNode);
      this.registerImplementation(ConcaveNode);
      this.registerImplementation(ConvexNode);
      this.registerImplementation(DestinationNode);
      this.registerImplementation(DifferenceNode);
      this.registerImplementation(DistanceNode);
      this.registerImplementation(EnvelopeNode);
      this.registerImplementation(ExplodeNode);
      this.registerImplementation(FeatureCollectionNode);
      this.registerImplementation(FeatureNode);
      this.registerImplementation(FlattenNode);
      this.registerImplementation(FlipNode);
      this.registerImplementation(GeometryCollectionNode);
      this.registerImplementation(GeoJsonNode);
      this.registerImplementation(GeoJsonToSvgNode);
      this.registerImplementation(GreatCircleNode);
      this.registerImplementation(IntersectNode);
      this.registerImplementation(KinksNode);
      this.registerImplementation(LengthNode);
      this.registerImplementation(LineArcNode);
      this.registerImplementation(LineChunkNode);
      this.registerImplementation(LineIntersectNode);
      this.registerImplementation(LineOffsetNode);
      this.registerImplementation(LineOverlapNode);
      this.registerImplementation(LineSegmentNode);
      this.registerImplementation(LineSliceAlongNode);
      this.registerImplementation(LineSliceNode);
      this.registerImplementation(LineSplitNode);
      this.registerImplementation(LineStringNode);
      this.registerImplementation(LineToPolygonNode);
      this.registerImplementation(MaskNode);
      this.registerImplementation(MidpointNode);
      this.registerImplementation(MultiLineStringNode);
      this.registerImplementation(MultiPointNode);
      this.registerImplementation(MultiPolygonNode);
      this.registerImplementation(NearestPointNode);
      this.registerImplementation(NearestPointOnLineNode);
      this.registerImplementation(PointNode);
      this.registerImplementation(PointOnFeatureNode);
      this.registerImplementation(PointToLineDistanceNode);
      this.registerImplementation(PointToPolygonDistanceNode);
      this.registerImplementation(PolygonNode);
      this.registerImplementation(PolygonSmoothNode);
      this.registerImplementation(PolygonTangentsNode);
      this.registerImplementation(PolygonToLineNode);
      this.registerImplementation(PolygonizeNode);
      this.registerImplementation(SvgToPngNode);
      this.registerImplementation(RewindNode);
      this.registerImplementation(RhumbBearingNode);
      this.registerImplementation(RhumbDestinationNode);
      this.registerImplementation(RhumbDistanceNode);
      this.registerImplementation(RoundNode);
      this.registerImplementation(SectorNode);
      this.registerImplementation(ShortestPathNode);
      this.registerImplementation(SimplifyNode);
      this.registerImplementation(SquareNode);
      this.registerImplementation(TransformRotateNode);
      this.registerImplementation(TransformScaleNode);
      this.registerImplementation(TransformTranslateNode);
      this.registerImplementation(TruncateNode);
      this.registerImplementation(UnionNode);
      this.registerImplementation(UnkinkPolygonNode);
      this.registerImplementation(VoronoiNode);
      this.registerImplementation(WktGeometryNode);
    }

    // OpenAI models
    if (hasOpenAI) {
      this.registerImplementation(Gpt41Node);
      this.registerImplementation(Gpt5Node);
      this.registerImplementation(Gpt5MiniNode);
      this.registerImplementation(Gpt5NanoNode);
    }

    // Anthropic Claude nodes
    if (hasAnthropic) {
      this.registerImplementation(ClaudeOpus41Node);
      this.registerImplementation(ClaudeOpus4Node);
      this.registerImplementation(ClaudeSonnet4Node);
      this.registerImplementation(Claude37SonnetNode);
      this.registerImplementation(Claude35SonnetNode);
      this.registerImplementation(Claude35HaikuNode);
      this.registerImplementation(Claude3OpusNode);
    }
  }
}
