import { CgsApplyMaterialNode } from "./3d/cgs-apply-material-node";
import { CgsApplyTextureNode } from "./3d/cgs-apply-texture-node";
import { CgsConeNode } from "./3d/cgs-cone-node";
import { CgsCubeNode } from "./3d/cgs-cube-node";
import { CgsCylinderNode } from "./3d/cgs-cylinder-node";
import { CgsDifferenceNode } from "./3d/cgs-difference-node";
import { CgsIntersectionNode } from "./3d/cgs-intersection-node";
import { CgsRotateNode } from "./3d/cgs-rotate-node";
import { CgsScaleNode } from "./3d/cgs-scale-node";
import { CgsSphereNode } from "./3d/cgs-sphere-node";
import { CgsTorusNode } from "./3d/cgs-torus-node";
import { CgsTranslateNode } from "./3d/cgs-translate-node";
import { CgsUnionNode } from "./3d/cgs-union-node";
import { CgsXorNode } from "./3d/cgs-xor-node";
import { DemToGltfNode } from "./3d/dem-to-gltf-node";
import { GeoTiffDemQueryNode } from "./3d/geotiff-dem-query-node";
import { GeoTiffMetadataReaderNode } from "./3d/geotiff-metadata-reader-node";
import { GeoTiffQueryNode } from "./3d/geotiff-query-node";
import { GeoTiffTransformNode } from "./3d/geotiff-transform-node";
import { GltfWireframeNode } from "./3d/gltf-wireframe-node";
import { TrellisNode } from "./3d/trellis-node";
import { Claude3OpusNode } from "./anthropic/claude-3-opus-node";
import { Claude35HaikuNode } from "./anthropic/claude-35-haiku-node";
import { Claude35SonnetNode } from "./anthropic/claude-35-sonnet-node";
import { Claude37SonnetNode } from "./anthropic/claude-37-sonnet-node";
import { ClaudeOpus4Node } from "./anthropic/claude-opus-4-node";
import { ClaudeOpus41Node } from "./anthropic/claude-opus-41-node";
import { ClaudeSonnet4Node } from "./anthropic/claude-sonnet-4-node";
import { AggregateItemsNode } from "./array/aggregate-items-node";
import { ExtractItemNode } from "./array/extract-item-node";
import { Aura1Node } from "./audio/aura-1-node";
import { MelottsNode } from "./audio/melotts-node";
import { Nova3Node } from "./audio/nova-3-node";
import { WhisperLargeV3TurboNode } from "./audio/whisper-large-v3-turbo-node";
import { WhisperNode } from "./audio/whisper-node";
import { WhisperTinyEnNode } from "./audio/whisper-tiny-en-node";
import { BaseNodeRegistry } from "./base-node-registry";
import { BlobToFormDataNode } from "./blob/blob-to-form-data-node";
import { BlobToJsonNode } from "./blob/blob-to-json-node";
import { BlobToTextNode } from "./blob/blob-to-text-node";
import { FileNode } from "./blob/file-node";
import { JsonToBlobNode } from "./blob/json-to-blob-node";
import { TextToBlobNode } from "./blob/text-to-blob-node";
import { CloudflareBrowserContentNode } from "./browser/cloudflare-browser-content-node";
import { CloudflareBrowserJsonNode } from "./browser/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "./browser/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "./browser/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "./browser/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "./browser/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "./browser/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "./browser/cloudflare-browser-snapshot-node";
import { CsvExtractColumnNode } from "./csv/csv-extract-column-node";
import { CsvFilterRowsNode } from "./csv/csv-filter-rows-node";
import { CsvParseNode } from "./csv/csv-parse-node";
import { CsvStringifyNode } from "./csv/csv-stringify-node";
import { DatabaseBuildTableNode } from "./database/database-build-table-node";
import { DatabaseDescribeTableNode } from "./database/database-describe-table-node";
import { DatabaseDropTableNode } from "./database/database-drop-table-node";
import { DatabaseExecuteNode } from "./database/database-execute-node";
import { DatabaseExportTableNode } from "./database/database-export-table-node";
import { DatabaseGetRowCountNode } from "./database/database-get-row-count-node";
import { DatabaseImportTableNode } from "./database/database-import-table-node";
import { DatabaseListTablesNode } from "./database/database-list-tables-node";
import { DatabaseQueryNode } from "./database/database-query-node";
import { DatabaseTableExistsNode } from "./database/database-table-exists-node";
import { DatabaseTruncateTableNode } from "./database/database-truncate-table-node";
import { DatasetAiSearchNode } from "./dataset/dataset-ai-search-node";
import { DatasetDeleteFileNode } from "./dataset/dataset-delete-file-node";
import { DatasetDownloadFileNode } from "./dataset/dataset-download-file-node";
import { DatasetListFilesNode } from "./dataset/dataset-list-files-node";
import { DatasetSearchNode } from "./dataset/dataset-search-node";
import { DatasetUploadFileNode } from "./dataset/dataset-upload-file-node";
import { AddDateNode } from "./date/add-date-node";
import { DiffDateNode } from "./date/diff-date-node";
import { NowDateNode } from "./date/now-date-node";
import { ParseDateNode } from "./date/parse-date-node";
import { AddReactionDiscordNode } from "./discord/add-reaction-discord-node";
import { GetChannelDiscordNode } from "./discord/get-channel-discord-node";
import { GetGuildDiscordNode } from "./discord/get-guild-discord-node";
import { ListGuildChannelsDiscordNode } from "./discord/list-guild-channels-discord-node";
import { ListUserGuildsDiscordNode } from "./discord/list-user-guilds-discord-node";
import { SendDMDiscordNode } from "./discord/send-dm-discord-node";
import { SendMessageDiscordNode } from "./discord/send-message-discord-node";
import { ToMarkdownNode } from "./document/to-markdown-node";
import { ExtractEmailAttachmentsNode } from "./email/extract-email-attachments-node";
import { ParseEmailNode } from "./email/parse-email-node";
import { ReceiveEmailNode } from "./email/receive-email-node";
import { SendEmailNode } from "./email/send-email-node";
import { FetchNode } from "./fetch/fetch-node";
import { Gemini25FlashAudioUnderstandingNode } from "./gemini/gemini-2-5-flash-audio-understanding-node";
import { Gemini25FlashImagePreviewNode } from "./gemini/gemini-2-5-flash-image-preview-node";
import { Gemini25FlashImageUnderstandingNode } from "./gemini/gemini-2-5-flash-image-understanding-node";
import { Gemini25FlashNode } from "./gemini/gemini-2-5-flash-node";
import { Gemini25FlashTtsNode } from "./gemini/gemini-2-5-flash-tts-node";
import { Gemini25ProNode } from "./gemini/gemini-2-5-pro-node";
import { Gemini3ProImagePreviewNode } from "./gemini/gemini-3-pro-image-preview-node";
import { ImagenNode } from "./gemini/imagen-node";
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
import { CreateUpdateFileGithubNode } from "./github/create-update-file-github-node";
import { DeleteFileGithubNode } from "./github/delete-file-github-node";
import { FollowUserGithubNode } from "./github/follow-user-github-node";
import { GetFileContentsGithubNode } from "./github/get-file-contents-github-node";
import { GetRepositoryGithubNode } from "./github/get-repository-github-node";
import { GetUserGithubNode } from "./github/get-user-github-node";
import { ListOrganizationRepositoriesGithubNode } from "./github/list-organization-repositories-github-node";
import { ListUserRepositoriesGithubNode } from "./github/list-user-repositories-github-node";
import { SearchRepositoriesGithubNode } from "./github/search-repositories-github-node";
import { StarRepositoryGithubNode } from "./github/star-repository-github-node";
import { UnfollowUserGithubNode } from "./github/unfollow-user-github-node";
import { UnstarRepositoryGithubNode } from "./github/unstar-repository-github-node";
import { AddAttendeesGoogleCalendarNode } from "./google-calendar/add-attendees-google-calendar-node";
import { CheckAvailabilityGoogleCalendarNode } from "./google-calendar/check-availability-google-calendar-node";
import { CreateEventGoogleCalendarNode } from "./google-calendar/create-event-google-calendar-node";
import { DeleteEventGoogleCalendarNode } from "./google-calendar/delete-event-google-calendar-node";
import { GetEventGoogleCalendarNode } from "./google-calendar/get-event-google-calendar-node";
import { ListCalendarsGoogleCalendarNode } from "./google-calendar/list-calendars-google-calendar-node";
import { ListEventsGoogleCalendarNode } from "./google-calendar/list-events-google-calendar-node";
import { QuickAddGoogleCalendarNode } from "./google-calendar/quick-add-google-calendar-node";
import { SearchEventsGoogleCalendarNode } from "./google-calendar/search-events-google-calendar-node";
import { UpdateEventGoogleCalendarNode } from "./google-calendar/update-event-google-calendar-node";
import { ArchiveMessageGoogleMailNode } from "./google-mail/archive-message-google-mail-node";
import { CheckDraftGoogleMailNode } from "./google-mail/check-draft-google-mail-node";
import { CreateReplyDraftGoogleMailNode } from "./google-mail/create-reply-draft-google-mail-node";
import { DeleteDraftGoogleMailNode } from "./google-mail/delete-draft-google-mail-node";
import { GetMessageGoogleMailNode } from "./google-mail/get-message-google-mail-node";
import { MarkMessageGoogleMailNode } from "./google-mail/mark-message-google-mail-node";
import { ModifyLabelsGoogleMailNode } from "./google-mail/modify-labels-google-mail-node";
import { ReadInboxGoogleMailNode } from "./google-mail/read-inbox-google-mail-node";
import { SearchMessagesGoogleMailNode } from "./google-mail/search-messages-google-mail-node";
import { SendDraftGoogleMailNode } from "./google-mail/send-draft-google-mail-node";
import { SendEmailGoogleMailNode } from "./google-mail/send-email-google-mail-node";
import { TrashMessageGoogleMailNode } from "./google-mail/trash-message-google-mail-node";
import { UpdateDraftGoogleMailNode } from "./google-mail/update-draft-google-mail-node";
import { HttpRequestNode } from "./http/http-request-node";
import { HttpResponseNode } from "./http/http-response-node";
import { JsonBodyNode } from "./http/json-body-node";
import { TestAllTypesNode } from "./http/test-all-types-node";
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
import { Recraft20bNode } from "./image/recraft-20b";
import { Recraft20bSvgNode } from "./image/recraft-20b-svg";
import { RecraftCreativeUpscaleNode } from "./image/recraft-creative-upscale";
import { RecraftCrispUpscaleNode } from "./image/recraft-crisp-upscale";
import { RecraftRemoveBackgroundNode } from "./image/recraft-remove-background";
import { RecraftV3Node } from "./image/recraft-v3";
import { RecraftV3SvgNode } from "./image/recraft-v3-svg";
import { RecraftVectorizeNode } from "./image/recraft-vectorize";
import { Resnet50Node } from "./image/resnet-50-node";
import { StableDiffusionV15Img2ImgNode } from "./image/stable-diffusion-v1-5-img2-img-node";
import { StableDiffusionV15InpaintingNode } from "./image/stable-diffusion-v1-5-inpainting-node";
import { StableDiffusionXLBase10Node } from "./image/stable-diffusion-xl-base-1-0-node";
import { StableDiffusionXLLightningNode } from "./image/stable-diffusion-xl-lightning-node";
import { SvgToPngNode } from "./image/svg-to-png-node";
import { UformGen2Qwen500mNode } from "./image/uform-gen2-qwen-500m-node";
import { AudioInputNode } from "./input/audio-input-node";
import { AudioRecorderInputNode } from "./input/audio-recorder-input-node";
import { BlobInputNode } from "./input/blob-input-node";
import { BooleanInputNode } from "./input/boolean-input-node";
import { CanvasInputNode } from "./input/canvas-input-node";
import { DateInputNode } from "./input/date-input-node";
import { DocumentInputNode } from "./input/document-input-node";
import { GeoJSONInputNode } from "./input/geojson-input-node";
import { GltfInputNode } from "./input/gltf-input-node";
import { ImageInputNode } from "./input/image-input-node";
import { JavaScriptInputNode } from "./input/javascript-input-node";
import { JsonInputNode } from "./input/json-input-node";
import { NumberInputNode } from "./input/number-input-node";
import { SecretInputNode } from "./input/secret-input-node";
import { SliderInputNode } from "./input/slider-input-node";
import { TextInputNode } from "./input/text-input-node";
import { WebcamInputNode } from "./input/webcam-input-node";
import { JavascriptScriptNode } from "./javascript/javascript-script-node";
import { JsonAggNode } from "./json/json-agg-node";
import { JsonArrayLengthNode } from "./json/json-array-length-node";
import { JsonContainsNode } from "./json/json-contains-node";
import { JsonContainsPathNode } from "./json/json-contains-path-node";
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
import { CommentOnPostLinkedInNode } from "./linkedin/comment-on-post-linkedin-node";
import { GetPostCommentsLinkedInNode } from "./linkedin/get-post-comments-linkedin-node";
import { GetPostLikesLinkedInNode } from "./linkedin/get-post-likes-linkedin-node";
import { GetProfileLinkedInNode } from "./linkedin/get-profile-linkedin-node";
import { LikePostLinkedInNode } from "./linkedin/like-post-linkedin-node";
import { SharePostLinkedInNode } from "./linkedin/share-post-linkedin-node";
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
import { SquareRootNode } from "./math/square-root-node";
import { SubtractionNode } from "./math/subtraction-node";
import { SumNode } from "./math/sum-node";
import { Gpt5MiniNode } from "./openai/gpt-5-mini-node";
import { Gpt5NanoNode } from "./openai/gpt-5-nano-node";
import { Gpt5Node } from "./openai/gpt-5-node";
import { Gpt41Node } from "./openai/gpt-41-node";
import { GptOss20BNode } from "./openai/gpt-oss-20b-node";
import { GptOss120BNode } from "./openai/gpt-oss-120b-node";
import {
  AnyOutputNode,
  AudioOutputNode,
  BlobOutputNode,
  BooleanOutputNode,
  DateOutputNode,
  DocumentOutputNode,
  GeoJSONOutputNode,
  GltfOutputNode,
  ImageOutputNode,
  JsonOutputNode,
  NumberOutputNode,
  SecretOutputNode,
  TextOutputNode,
} from "./output";
import { ReceiveQueueMessageNode } from "./queue/receive-queue-message-node";
import { SendQueueBatchNode } from "./queue/send-queue-batch-node";
import { SendQueueMessageNode } from "./queue/send-queue-message-node";
import { RandomChoiceNode } from "./random/random-choice-node";
import { RandomNumberNode } from "./random/random-number-node";
import { RandomStringNode } from "./random/random-string-node";
import { RandomUuidNode } from "./random/random-uuid-node";
import { GetSubredditRedditNode } from "./reddit/get-subreddit-reddit-node";
import { GetUserRedditNode } from "./reddit/get-user-reddit-node";
import { ListPostsRedditNode } from "./reddit/list-posts-reddit-node";
import { SubmitCommentRedditNode } from "./reddit/submit-comment-reddit-node";
import { SubmitPostRedditNode } from "./reddit/submit-post-reddit-node";
import { VoteRedditNode } from "./reddit/vote-reddit-node";
import { ReceiveScheduledTriggerNode } from "./scheduled/receive-scheduled-trigger-node";
import { BartLargeCnnNode } from "./text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "./text/bge-reranker-base-node";
import { DeepseekR1DistillQwen32BNode } from "./text/deepseek-r1-distill-qwen-32b-node";
import { DistilbertSst2Int8Node } from "./text/distilbert-sst-2-int8-node";
import { Hermes2ProMistral7BNode } from "./text/hermes-2-pro-mistral-7b-node";
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
    const hasSESEmail = !!(
      this.env.AWS_ACCESS_KEY_ID &&
      this.env.AWS_SECRET_ACCESS_KEY &&
      this.env.AWS_REGION &&
      this.env.SES_DEFAULT_FROM
    );
    const hasGoogleMail = !!(
      this.env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID &&
      this.env.INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET
    );
    const hasGoogleCalendar = !!(
      this.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID &&
      this.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET
    );
    const hasDiscord = !!(
      this.env.INTEGRATION_DISCORD_CLIENT_ID &&
      this.env.INTEGRATION_DISCORD_CLIENT_SECRET
    );
    const hasGitHub = !!(
      this.env.INTEGRATION_GITHUB_CLIENT_ID &&
      this.env.INTEGRATION_GITHUB_CLIENT_SECRET
    );
    const hasReddit = !!(
      this.env.INTEGRATION_REDDIT_CLIENT_ID &&
      this.env.INTEGRATION_REDDIT_CLIENT_SECRET
    );
    const hasLinkedIn = !!(
      this.env.INTEGRATION_LINKEDIN_CLIENT_ID &&
      this.env.INTEGRATION_LINKEDIN_CLIENT_SECRET
    );

    // Register all core nodes
    this.registerImplementation(HttpRequestNode);
    this.registerImplementation(JsonBodyNode);
    this.registerImplementation(TestAllTypesNode);
    this.registerImplementation(SendQueueMessageNode);
    this.registerImplementation(SendQueueBatchNode);
    this.registerImplementation(ReceiveQueueMessageNode);
    this.registerImplementation(DatabaseQueryNode);
    this.registerImplementation(DatabaseExecuteNode);
    this.registerImplementation(DatabaseImportTableNode);
    this.registerImplementation(DatabaseExportTableNode);
    this.registerImplementation(DatabaseDescribeTableNode);
    this.registerImplementation(DatabaseBuildTableNode);
    this.registerImplementation(DatabaseListTablesNode);
    this.registerImplementation(DatabaseDropTableNode);
    this.registerImplementation(DatabaseTableExistsNode);
    this.registerImplementation(DatabaseGetRowCountNode);
    this.registerImplementation(DatabaseTruncateTableNode);
    this.registerImplementation(ReceiveEmailNode);
    this.registerImplementation(ReceiveScheduledTriggerNode);
    this.registerImplementation(ParseEmailNode);
    this.registerImplementation(ExtractEmailAttachmentsNode);
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
    this.registerImplementation(RandomChoiceNode);
    this.registerImplementation(RandomNumberNode);
    this.registerImplementation(RandomStringNode);
    this.registerImplementation(RandomUuidNode);
    this.registerImplementation(TextInputNode);
    this.registerImplementation(ToStringNode);
    this.registerImplementation(NumberInputNode);
    this.registerImplementation(SliderInputNode);
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
    this.registerImplementation(ExtractItemNode);
    this.registerImplementation(AggregateItemsNode);
    this.registerImplementation(JsonExtractStringNode);
    this.registerImplementation(JsonExtractBooleanNode);
    this.registerImplementation(JsonExtractNumberNode);
    this.registerImplementation(JsonExtractObjectNode);
    this.registerImplementation(JsonExtractAllNode);
    this.registerImplementation(JsonExecuteJavascriptNode);
    this.registerImplementation(JsonTemplateNode);
    this.registerImplementation(JsonInputNode);
    // Date nodes
    this.registerImplementation(DateInputNode);
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
    this.registerImplementation(JsonToBlobNode);
    this.registerImplementation(JsonToGeojsonNode);
    this.registerImplementation(JsonTypeofNode);
    this.registerImplementation(JsonValidNode);
    this.registerImplementation(MultiVariableStringTemplateNode);
    this.registerImplementation(SingleVariableStringTemplateNode);
    this.registerImplementation(JavaScriptInputNode);
    this.registerImplementation(JavascriptScriptNode);
    this.registerImplementation(LLaVA157BHFNode);
    this.registerImplementation(CanvasInputNode);
    this.registerImplementation(StableDiffusionXLBase10Node);
    this.registerImplementation(Flux1SchnellNode);
    this.registerImplementation(DreamShaper8LCMNode);
    this.registerImplementation(ExifReaderNode);
    this.registerImplementation(Aura1Node);
    this.registerImplementation(MelottsNode);
    this.registerImplementation(Nova3Node);
    this.registerImplementation(WebcamInputNode);

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
    this.registerImplementation(BooleanInputNode);
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
    this.registerImplementation(Recraft20bNode);
    this.registerImplementation(Recraft20bSvgNode);
    this.registerImplementation(RecraftCreativeUpscaleNode);
    this.registerImplementation(RecraftCrispUpscaleNode);
    this.registerImplementation(RecraftRemoveBackgroundNode);
    this.registerImplementation(RecraftV3Node);
    this.registerImplementation(RecraftV3SvgNode);
    this.registerImplementation(RecraftVectorizeNode);

    this.registerImplementation(AudioInputNode);
    this.registerImplementation(AudioRecorderInputNode);
    this.registerImplementation(ImageInputNode);
    this.registerImplementation(BlobInputNode);
    this.registerImplementation(DocumentInputNode);
    this.registerImplementation(GltfInputNode);
    this.registerImplementation(GeoJSONInputNode);
    this.registerImplementation(SecretInputNode);

    this.registerImplementation(CsvExtractColumnNode);
    this.registerImplementation(CsvFilterRowsNode);
    this.registerImplementation(CsvParseNode);
    this.registerImplementation(CsvStringifyNode);
    this.registerImplementation(ToMarkdownNode);
    this.registerImplementation(FileNode);
    this.registerImplementation(BlobToFormDataNode);
    this.registerImplementation(BlobToJsonNode);
    this.registerImplementation(BlobToTextNode);
    this.registerImplementation(JsonToBlobNode);
    this.registerImplementation(TextToBlobNode);
    this.registerImplementation(FetchNode);
    this.registerImplementation(HttpResponseNode);

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
      this.registerImplementation(SendEmailNode);
    }

    if (hasGoogleMail) {
      // gmail.send scope only (non-restricted)
      this.registerImplementation(SendEmailGoogleMailNode);

      // Restricted scopes - require Google security audit
      if (this.developerMode) {
        this.registerImplementation(CreateReplyDraftGoogleMailNode);
        this.registerImplementation(CheckDraftGoogleMailNode);
        this.registerImplementation(SendDraftGoogleMailNode);
        this.registerImplementation(DeleteDraftGoogleMailNode);
        this.registerImplementation(UpdateDraftGoogleMailNode);
        this.registerImplementation(ReadInboxGoogleMailNode);
        this.registerImplementation(MarkMessageGoogleMailNode);
        this.registerImplementation(ModifyLabelsGoogleMailNode);
        this.registerImplementation(SearchMessagesGoogleMailNode);
        this.registerImplementation(GetMessageGoogleMailNode);
        this.registerImplementation(ArchiveMessageGoogleMailNode);
        this.registerImplementation(TrashMessageGoogleMailNode);
      }
    }

    if (hasGoogleCalendar) {
      this.registerImplementation(CreateEventGoogleCalendarNode);
      this.registerImplementation(ListEventsGoogleCalendarNode);
      this.registerImplementation(GetEventGoogleCalendarNode);
      this.registerImplementation(UpdateEventGoogleCalendarNode);
      this.registerImplementation(DeleteEventGoogleCalendarNode);
      this.registerImplementation(SearchEventsGoogleCalendarNode);
      this.registerImplementation(AddAttendeesGoogleCalendarNode);
      this.registerImplementation(CheckAvailabilityGoogleCalendarNode);
      this.registerImplementation(QuickAddGoogleCalendarNode);
      this.registerImplementation(ListCalendarsGoogleCalendarNode);
    }

    if (hasDiscord) {
      this.registerImplementation(SendMessageDiscordNode);
      this.registerImplementation(SendDMDiscordNode);
      this.registerImplementation(GetChannelDiscordNode);
      this.registerImplementation(ListGuildChannelsDiscordNode);
      this.registerImplementation(GetGuildDiscordNode);
      this.registerImplementation(ListUserGuildsDiscordNode);
      this.registerImplementation(AddReactionDiscordNode);
    }

    if (hasReddit) {
      this.registerImplementation(SubmitPostRedditNode);
      this.registerImplementation(SubmitCommentRedditNode);
      this.registerImplementation(GetSubredditRedditNode);
      this.registerImplementation(GetUserRedditNode);
      this.registerImplementation(ListPostsRedditNode);
      this.registerImplementation(VoteRedditNode);
    }

    if (hasLinkedIn) {
      this.registerImplementation(SharePostLinkedInNode);
      this.registerImplementation(GetProfileLinkedInNode);
      this.registerImplementation(CommentOnPostLinkedInNode);
      this.registerImplementation(LikePostLinkedInNode);
      this.registerImplementation(GetPostCommentsLinkedInNode);
      this.registerImplementation(GetPostLikesLinkedInNode);
    }

    if (hasGitHub) {
      this.registerImplementation(GetRepositoryGithubNode);
      this.registerImplementation(GetUserGithubNode);
      this.registerImplementation(SearchRepositoriesGithubNode);
      this.registerImplementation(StarRepositoryGithubNode);
      this.registerImplementation(UnstarRepositoryGithubNode);
      this.registerImplementation(FollowUserGithubNode);
      this.registerImplementation(UnfollowUserGithubNode);
      this.registerImplementation(GetFileContentsGithubNode);
      this.registerImplementation(CreateUpdateFileGithubNode);
      this.registerImplementation(DeleteFileGithubNode);
      this.registerImplementation(ListUserRepositoriesGithubNode);
      this.registerImplementation(ListOrganizationRepositoriesGithubNode);
    }

    // Dataset nodes
    if (this.developerMode) {
      this.registerImplementation(DatasetAiSearchNode);
      this.registerImplementation(DatasetDeleteFileNode);
      this.registerImplementation(DatasetDownloadFileNode);
      this.registerImplementation(DatasetListFilesNode);
      this.registerImplementation(DatasetSearchNode);
      this.registerImplementation(DatasetUploadFileNode);
    }

    // 3D Tiles workflow nodes
    if (this.developerMode) {
      this.registerImplementation(DemToGltfNode);
      this.registerImplementation(GeoTiffDemQueryNode);
      this.registerImplementation(GeoTiffMetadataReaderNode);
      this.registerImplementation(GeoTiffQueryNode);
      this.registerImplementation(GeoTiffTransformNode);
      this.registerImplementation(GltfWireframeNode);
      this.registerImplementation(TrellisNode);
    }

    // CSG geometry nodes
    if (this.developerMode) {
      // CSG Primitives
      this.registerImplementation(CgsCubeNode);
      this.registerImplementation(CgsSphereNode);
      this.registerImplementation(CgsCylinderNode);
      this.registerImplementation(CgsConeNode);
      this.registerImplementation(CgsTorusNode);

      // CSG Operations
      this.registerImplementation(CgsUnionNode);
      this.registerImplementation(CgsDifferenceNode);
      this.registerImplementation(CgsIntersectionNode);
      this.registerImplementation(CgsXorNode);

      // CSG Material & Texture
      this.registerImplementation(CgsApplyMaterialNode);
      this.registerImplementation(CgsApplyTextureNode);

      // CSG Transformations
      this.registerImplementation(CgsTranslateNode);
      this.registerImplementation(CgsRotateNode);
      this.registerImplementation(CgsScaleNode);
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

    // OpenAI models - always register (users can provide API keys via secrets)
    this.registerImplementation(Gpt41Node);
    this.registerImplementation(Gpt5Node);
    this.registerImplementation(Gpt5MiniNode);
    this.registerImplementation(Gpt5NanoNode);

    // Anthropic Claude nodes - always register (users can provide API keys via secrets)
    this.registerImplementation(ClaudeOpus41Node);
    this.registerImplementation(ClaudeOpus4Node);
    this.registerImplementation(ClaudeSonnet4Node);
    this.registerImplementation(Claude37SonnetNode);
    this.registerImplementation(Claude35SonnetNode);
    this.registerImplementation(Claude35HaikuNode);
    this.registerImplementation(Claude3OpusNode);

    // Google Gemini nodes - always register (users can provide API keys via secrets)
    this.registerImplementation(Gemini25FlashNode);
    this.registerImplementation(Gemini25ProNode);
    this.registerImplementation(Gemini25FlashImagePreviewNode);
    this.registerImplementation(Gemini3ProImagePreviewNode);
    this.registerImplementation(Gemini25FlashTtsNode);
    this.registerImplementation(Gemini25FlashAudioUnderstandingNode);
    this.registerImplementation(Gemini25FlashImageUnderstandingNode);
    this.registerImplementation(ImagenNode);

    // Output/Widget nodes - always register (for displaying all parameter types)
    this.registerImplementation(TextOutputNode);
    this.registerImplementation(NumberOutputNode);
    this.registerImplementation(BooleanOutputNode);
    this.registerImplementation(DateOutputNode);
    this.registerImplementation(BlobOutputNode);
    this.registerImplementation(ImageOutputNode);
    this.registerImplementation(DocumentOutputNode);
    this.registerImplementation(AudioOutputNode);
    this.registerImplementation(GltfOutputNode);
    this.registerImplementation(JsonOutputNode);
    this.registerImplementation(GeoJSONOutputNode);
    this.registerImplementation(SecretOutputNode);
    this.registerImplementation(AnyOutputNode);
  }
}
