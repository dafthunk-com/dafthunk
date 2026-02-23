// import { CgsApplyMaterialNode } from "@dafthunk/runtime/nodes/3d/cgs-apply-material-node";
// import { CgsApplyTextureNode } from "@dafthunk/runtime/nodes/3d/cgs-apply-texture-node";
// import { CgsConeNode } from "@dafthunk/runtime/nodes/3d/cgs-cone-node";
// import { CgsCubeNode } from "@dafthunk/runtime/nodes/3d/cgs-cube-node";
// import { CgsCylinderNode } from "@dafthunk/runtime/nodes/3d/cgs-cylinder-node";
// import { CgsDifferenceNode } from "@dafthunk/runtime/nodes/3d/cgs-difference-node";
// import { CgsIntersectionNode } from "@dafthunk/runtime/nodes/3d/cgs-intersection-node";
// import { CgsRotateNode } from "@dafthunk/runtime/nodes/3d/cgs-rotate-node";
// import { CgsScaleNode } from "@dafthunk/runtime/nodes/3d/cgs-scale-node";
// import { CgsSphereNode } from "@dafthunk/runtime/nodes/3d/cgs-sphere-node";
// import { CgsTorusNode } from "@dafthunk/runtime/nodes/3d/cgs-torus-node";
// import { CgsTranslateNode } from "@dafthunk/runtime/nodes/3d/cgs-translate-node";
// import { CgsUnionNode } from "@dafthunk/runtime/nodes/3d/cgs-union-node";
// import { CgsXorNode } from "@dafthunk/runtime/nodes/3d/cgs-xor-node";
// import { DemToGltfNode } from "@dafthunk/runtime/nodes/3d/dem-to-gltf-node";
// import { GeoTiffDemQueryNode } from "@dafthunk/runtime/nodes/3d/geotiff-dem-query-node";
// import { GeoTiffMetadataReaderNode } from "@dafthunk/runtime/nodes/3d/geotiff-metadata-reader-node";
// import { GeoTiffQueryNode } from "@dafthunk/runtime/nodes/3d/geotiff-query-node";
// import { GeoTiffTransformNode } from "@dafthunk/runtime/nodes/3d/geotiff-transform-node";
// import { GltfWireframeNode } from "@dafthunk/runtime/nodes/3d/gltf-wireframe-node";

import { BaseNodeRegistry } from "@dafthunk/runtime";
import { TrellisNode } from "@dafthunk/runtime/nodes/3d/trellis-node";
import { Trellis2Node } from "@dafthunk/runtime/nodes/3d/trellis2-node";
import { AgentClaudeSonnet4Node } from "@dafthunk/runtime/nodes/agent/agent-claude-sonnet-4-node";
import { AgentGemini25FlashNode } from "@dafthunk/runtime/nodes/agent/agent-gemini-2-5-flash-node";
import { AgentGpt41Node } from "@dafthunk/runtime/nodes/agent/agent-gpt-41-node";
import { AgentQwen330BA3BFp8Node } from "@dafthunk/runtime/nodes/agent/agent-qwen3-30b-a3b-fp8-node";
import { Claude3OpusNode } from "@dafthunk/runtime/nodes/anthropic/claude-3-opus-node";
import { Claude35HaikuNode } from "@dafthunk/runtime/nodes/anthropic/claude-35-haiku-node";
import { Claude35SonnetNode } from "@dafthunk/runtime/nodes/anthropic/claude-35-sonnet-node";
import { Claude37SonnetNode } from "@dafthunk/runtime/nodes/anthropic/claude-37-sonnet-node";
import { ClaudeOpus4Node } from "@dafthunk/runtime/nodes/anthropic/claude-opus-4-node";
import { ClaudeOpus41Node } from "@dafthunk/runtime/nodes/anthropic/claude-opus-41-node";
import { ClaudeSonnet4Node } from "@dafthunk/runtime/nodes/anthropic/claude-sonnet-4-node";
import { AggregateItemsNode } from "@dafthunk/runtime/nodes/array/aggregate-items-node";
import { ExtractItemNode } from "@dafthunk/runtime/nodes/array/extract-item-node";
import { Aura1Node } from "@dafthunk/runtime/nodes/audio/aura-1-node";
import { MelottsNode } from "@dafthunk/runtime/nodes/audio/melotts-node";
import { Nova3Node } from "@dafthunk/runtime/nodes/audio/nova-3-node";
import { WhisperLargeV3TurboNode } from "@dafthunk/runtime/nodes/audio/whisper-large-v3-turbo-node";
import { WhisperNode } from "@dafthunk/runtime/nodes/audio/whisper-node";
import { WhisperTinyEnNode } from "@dafthunk/runtime/nodes/audio/whisper-tiny-en-node";
import { BlobToFormDataNode } from "@dafthunk/runtime/nodes/blob/blob-to-form-data-node";
import { BlobToJsonNode } from "@dafthunk/runtime/nodes/blob/blob-to-json-node";
import { BlobToTextNode } from "@dafthunk/runtime/nodes/blob/blob-to-text-node";
import { FileNode } from "@dafthunk/runtime/nodes/blob/file-node";
import { JsonToBlobNode } from "@dafthunk/runtime/nodes/blob/json-to-blob-node";
import { TextToBlobNode } from "@dafthunk/runtime/nodes/blob/text-to-blob-node";
import { CloudflareBrowserContentNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-content-node";
import { CloudflareBrowserJsonNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-snapshot-node";
import { CsvExtractColumnNode } from "@dafthunk/runtime/nodes/csv/csv-extract-column-node";
import { CsvFilterRowsNode } from "@dafthunk/runtime/nodes/csv/csv-filter-rows-node";
import { CsvParseNode } from "@dafthunk/runtime/nodes/csv/csv-parse-node";
import { CsvStringifyNode } from "@dafthunk/runtime/nodes/csv/csv-stringify-node";
import { DatabaseBuildTableNode } from "@dafthunk/runtime/nodes/database/database-build-table-node";
import { DatabaseDescribeTableNode } from "@dafthunk/runtime/nodes/database/database-describe-table-node";
import { DatabaseDropTableNode } from "@dafthunk/runtime/nodes/database/database-drop-table-node";
import { DatabaseExecuteNode } from "@dafthunk/runtime/nodes/database/database-execute-node";
import { DatabaseExportTableNode } from "@dafthunk/runtime/nodes/database/database-export-table-node";
import { DatabaseGetRowCountNode } from "@dafthunk/runtime/nodes/database/database-get-row-count-node";
import { DatabaseImportTableNode } from "@dafthunk/runtime/nodes/database/database-import-table-node";
import { DatabaseListTablesNode } from "@dafthunk/runtime/nodes/database/database-list-tables-node";
import { DatabaseQueryNode } from "@dafthunk/runtime/nodes/database/database-query-node";
import { DatabaseTableExistsNode } from "@dafthunk/runtime/nodes/database/database-table-exists-node";
import { DatabaseTruncateTableNode } from "@dafthunk/runtime/nodes/database/database-truncate-table-node";
import { DatasetAiSearchNode } from "@dafthunk/runtime/nodes/dataset/dataset-ai-search-node";
import { DatasetDeleteFileNode } from "@dafthunk/runtime/nodes/dataset/dataset-delete-file-node";
import { DatasetDownloadFileNode } from "@dafthunk/runtime/nodes/dataset/dataset-download-file-node";
import { DatasetListFilesNode } from "@dafthunk/runtime/nodes/dataset/dataset-list-files-node";
import { DatasetSearchNode } from "@dafthunk/runtime/nodes/dataset/dataset-search-node";
import { DatasetUploadFileNode } from "@dafthunk/runtime/nodes/dataset/dataset-upload-file-node";
import { AddDateNode } from "@dafthunk/runtime/nodes/date/add-date-node";
import { DiffDateNode } from "@dafthunk/runtime/nodes/date/diff-date-node";
import { NowDateNode } from "@dafthunk/runtime/nodes/date/now-date-node";
import { ParseDateNode } from "@dafthunk/runtime/nodes/date/parse-date-node";
import { AddReactionDiscordNode } from "@dafthunk/runtime/nodes/discord/add-reaction-discord-node";
import { GetChannelDiscordNode } from "@dafthunk/runtime/nodes/discord/get-channel-discord-node";
import { GetGuildDiscordNode } from "@dafthunk/runtime/nodes/discord/get-guild-discord-node";
import { ListGuildChannelsDiscordNode } from "@dafthunk/runtime/nodes/discord/list-guild-channels-discord-node";
import { ListUserGuildsDiscordNode } from "@dafthunk/runtime/nodes/discord/list-user-guilds-discord-node";
import { SendDMDiscordNode } from "@dafthunk/runtime/nodes/discord/send-dm-discord-node";
import { SendMessageDiscordNode } from "@dafthunk/runtime/nodes/discord/send-message-discord-node";
import { ToMarkdownNode } from "@dafthunk/runtime/nodes/document/to-markdown-node";
import { ExtractEmailAttachmentsNode } from "@dafthunk/runtime/nodes/email/extract-email-attachments-node";
import { ParseEmailNode } from "@dafthunk/runtime/nodes/email/parse-email-node";
import { ReceiveEmailNode } from "@dafthunk/runtime/nodes/email/receive-email-node";
import { SendEmailNode } from "@dafthunk/runtime/nodes/email/send-email-node";
import { FetchNode } from "@dafthunk/runtime/nodes/fetch/fetch-node";
import { Gemini25FlashAudioUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-audio-understanding-node";
import { Gemini25FlashImagePreviewNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-image-preview-node";
import { Gemini25FlashImageUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-image-understanding-node";
import { Gemini25FlashNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-node";
import { Gemini25FlashTtsNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-flash-tts-node";
import { Gemini25ProAudioUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-pro-audio-understanding-node";
import { Gemini25ProImageUnderstandingNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-pro-image-understanding-node";
import { Gemini25ProNode } from "@dafthunk/runtime/nodes/gemini/gemini-2-5-pro-node";
import { Gemini3ProImagePreviewNode } from "@dafthunk/runtime/nodes/gemini/gemini-3-pro-image-preview-node";
import { ImagenNode } from "@dafthunk/runtime/nodes/gemini/imagen-node";
// import { AlongNode } from "@dafthunk/runtime/nodes/geo/along-node";
// import { AngleNode } from "@dafthunk/runtime/nodes/geo/angle-node";
// import { AreaNode } from "@dafthunk/runtime/nodes/geo/area-node";
// import { BboxClipNode } from "@dafthunk/runtime/nodes/geo/bbox-clip-node";
// import { BboxNode } from "@dafthunk/runtime/nodes/geo/bbox-node";
// import { BboxPolygonNode } from "@dafthunk/runtime/nodes/geo/bbox-polygon-node";
// import { BearingNode } from "@dafthunk/runtime/nodes/geo/bearing-node";
// import { BooleanClockwiseNode } from "@dafthunk/runtime/nodes/geo/boolean-clockwise-node";
// import { BooleanConcaveNode } from "@dafthunk/runtime/nodes/geo/boolean-concave-node";
// import { BooleanContainsNode } from "@dafthunk/runtime/nodes/geo/boolean-contains-node";
// import { BooleanCrossesNode } from "@dafthunk/runtime/nodes/geo/boolean-crosses-node";
// import { BooleanDisjointNode } from "@dafthunk/runtime/nodes/geo/boolean-disjoint-node";
// import { BooleanEqualNode } from "@dafthunk/runtime/nodes/geo/boolean-equal-node";
// import { BooleanIntersectsNode } from "@dafthunk/runtime/nodes/geo/boolean-intersects-node";
// import { BooleanOverlapNode } from "@dafthunk/runtime/nodes/geo/boolean-overlap-node";
// import { BooleanParallelNode } from "@dafthunk/runtime/nodes/geo/boolean-parallel-node";
// import { BooleanPointInPolygonNode } from "@dafthunk/runtime/nodes/geo/boolean-point-in-polygon-node";
// import { BooleanPointOnLineNode } from "@dafthunk/runtime/nodes/geo/boolean-point-on-line-node";
// import { BooleanTouchesNode } from "@dafthunk/runtime/nodes/geo/boolean-touches-node";
// import { BooleanValidNode } from "@dafthunk/runtime/nodes/geo/boolean-valid-node";
// import { BooleanWithinNode } from "@dafthunk/runtime/nodes/geo/boolean-within-node";
// import { BufferNode } from "@dafthunk/runtime/nodes/geo/buffer-node";
// import { CenterMeanNode } from "@dafthunk/runtime/nodes/geo/center-mean-node";
// import { CenterMedianNode } from "@dafthunk/runtime/nodes/geo/center-median-node";
// import { CenterNode } from "@dafthunk/runtime/nodes/geo/center-node";
// import { CenterOfMassNode } from "@dafthunk/runtime/nodes/geo/center-of-mass-node";
// import { CentroidNode } from "@dafthunk/runtime/nodes/geo/centroid-node";
// import { CircleNode } from "@dafthunk/runtime/nodes/geo/circle-node";
// import { CleanCoordsNode } from "@dafthunk/runtime/nodes/geo/clean-coords-node";
// import { CombineNode } from "@dafthunk/runtime/nodes/geo/combine-node";
// import { ConcaveNode } from "@dafthunk/runtime/nodes/geo/concave-node";
// import { ConvexNode } from "@dafthunk/runtime/nodes/geo/convex-node";
// import { DestinationNode } from "@dafthunk/runtime/nodes/geo/destination-node";
// import { DifferenceNode } from "@dafthunk/runtime/nodes/geo/difference-node";
// import { DistanceNode } from "@dafthunk/runtime/nodes/geo/distance-node";
// import { EnvelopeNode } from "@dafthunk/runtime/nodes/geo/envelope-node";
// import { ExplodeNode } from "@dafthunk/runtime/nodes/geo/explode-node";
// import { FeatureCollectionNode } from "@dafthunk/runtime/nodes/geo/feature-collection-node";
// import { FeatureNode } from "@dafthunk/runtime/nodes/geo/feature-node";
// import { FlattenNode } from "@dafthunk/runtime/nodes/geo/flatten-node";
// import { FlipNode } from "@dafthunk/runtime/nodes/geo/flip-node";
// import { GeoJsonNode } from "@dafthunk/runtime/nodes/geo/geojson-node";
// import { GeoJsonToSvgNode } from "@dafthunk/runtime/nodes/geo/geojson-to-svg-node";
// import { GeometryCollectionNode } from "@dafthunk/runtime/nodes/geo/geometry-collection-node";
// import { GreatCircleNode } from "@dafthunk/runtime/nodes/geo/great-circle-node";
// import { IntersectNode } from "@dafthunk/runtime/nodes/geo/intersect-node";
// import { KinksNode } from "@dafthunk/runtime/nodes/geo/kinks-node";
// import { LengthNode } from "@dafthunk/runtime/nodes/geo/length-node";
// import { LineArcNode } from "@dafthunk/runtime/nodes/geo/line-arc-node";
// import { LineChunkNode } from "@dafthunk/runtime/nodes/geo/line-chunk-node";
// import { LineIntersectNode } from "@dafthunk/runtime/nodes/geo/line-intersect-node";
// import { LineOffsetNode } from "@dafthunk/runtime/nodes/geo/line-offset-node";
// import { LineOverlapNode } from "@dafthunk/runtime/nodes/geo/line-overlap-node";
// import { LineSegmentNode } from "@dafthunk/runtime/nodes/geo/line-segment-node";
// import { LineSliceAlongNode } from "@dafthunk/runtime/nodes/geo/line-slice-along-node";
// import { LineSliceNode } from "@dafthunk/runtime/nodes/geo/line-slice-node";
// import { LineSplitNode } from "@dafthunk/runtime/nodes/geo/line-split-node";
// import { LineToPolygonNode } from "@dafthunk/runtime/nodes/geo/line-to-polygon-node";
// import { LineStringNode } from "@dafthunk/runtime/nodes/geo/linestring-node";
// import { MaskNode } from "@dafthunk/runtime/nodes/geo/mask-node";
// import { MidpointNode } from "@dafthunk/runtime/nodes/geo/midpoint-node";
// import { MultiLineStringNode } from "@dafthunk/runtime/nodes/geo/multilinestring-node";
// import { MultiPointNode } from "@dafthunk/runtime/nodes/geo/multipoint-node";
// import { MultiPolygonNode } from "@dafthunk/runtime/nodes/geo/multipolygon-node";
// import { NearestPointNode } from "@dafthunk/runtime/nodes/geo/nearest-point-node";
// import { NearestPointOnLineNode } from "@dafthunk/runtime/nodes/geo/nearest-point-on-line-node";
// import { PointNode } from "@dafthunk/runtime/nodes/geo/point-node";
// import { PointOnFeatureNode } from "@dafthunk/runtime/nodes/geo/point-on-feature-node";
// import { PointToLineDistanceNode } from "@dafthunk/runtime/nodes/geo/point-to-line-distance-node";
// import { PointToPolygonDistanceNode } from "@dafthunk/runtime/nodes/geo/point-to-polygon-distance-node";
// import { PolygonNode } from "@dafthunk/runtime/nodes/geo/polygon-node";
// import { PolygonSmoothNode } from "@dafthunk/runtime/nodes/geo/polygon-smooth-node";
// import { PolygonTangentsNode } from "@dafthunk/runtime/nodes/geo/polygon-tangents-node";
// import { PolygonToLineNode } from "@dafthunk/runtime/nodes/geo/polygon-to-line-node";
// import { PolygonizeNode } from "@dafthunk/runtime/nodes/geo/polygonize-node";
// import { RewindNode } from "@dafthunk/runtime/nodes/geo/rewind-node";
// import { RhumbBearingNode } from "@dafthunk/runtime/nodes/geo/rhumb-bearing-node";
// import { RhumbDestinationNode } from "@dafthunk/runtime/nodes/geo/rhumb-destination-node";
// import { RhumbDistanceNode } from "@dafthunk/runtime/nodes/geo/rhumb-distance-node";
// import { RoundNode } from "@dafthunk/runtime/nodes/geo/round-node";
// import { SectorNode } from "@dafthunk/runtime/nodes/geo/sector-node";
// import { ShortestPathNode } from "@dafthunk/runtime/nodes/geo/shortest-path-node";
// import { SimplifyNode } from "@dafthunk/runtime/nodes/geo/simplify-node";
// import { SquareNode } from "@dafthunk/runtime/nodes/geo/square-node";
// import { TransformRotateNode } from "@dafthunk/runtime/nodes/geo/transform-rotate-node";
// import { TransformScaleNode } from "@dafthunk/runtime/nodes/geo/transform-scale-node";
// import { TransformTranslateNode } from "@dafthunk/runtime/nodes/geo/transform-translate-node";
// import { TruncateNode } from "@dafthunk/runtime/nodes/geo/truncate-node";
// import { UnionNode } from "@dafthunk/runtime/nodes/geo/union-node";
// import { UnkinkPolygonNode } from "@dafthunk/runtime/nodes/geo/unkink-polygon-node";
// import { VoronoiNode } from "@dafthunk/runtime/nodes/geo/voronoi-node";
// import { WktGeometryNode } from "@dafthunk/runtime/nodes/geo/wkt-geometry-node";
import { CreateUpdateFileGithubNode } from "@dafthunk/runtime/nodes/github/create-update-file-github-node";
import { DeleteFileGithubNode } from "@dafthunk/runtime/nodes/github/delete-file-github-node";
import { FollowUserGithubNode } from "@dafthunk/runtime/nodes/github/follow-user-github-node";
import { GetFileContentsGithubNode } from "@dafthunk/runtime/nodes/github/get-file-contents-github-node";
import { GetRepositoryGithubNode } from "@dafthunk/runtime/nodes/github/get-repository-github-node";
import { GetUserGithubNode } from "@dafthunk/runtime/nodes/github/get-user-github-node";
import { ListOrganizationRepositoriesGithubNode } from "@dafthunk/runtime/nodes/github/list-organization-repositories-github-node";
import { ListUserRepositoriesGithubNode } from "@dafthunk/runtime/nodes/github/list-user-repositories-github-node";
import { SearchRepositoriesGithubNode } from "@dafthunk/runtime/nodes/github/search-repositories-github-node";
import { StarRepositoryGithubNode } from "@dafthunk/runtime/nodes/github/star-repository-github-node";
import { UnfollowUserGithubNode } from "@dafthunk/runtime/nodes/github/unfollow-user-github-node";
import { UnstarRepositoryGithubNode } from "@dafthunk/runtime/nodes/github/unstar-repository-github-node";
import { AddAttendeesGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/add-attendees-google-calendar-node";
import { CheckAvailabilityGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/check-availability-google-calendar-node";
import { CreateEventGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/create-event-google-calendar-node";
import { DeleteEventGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/delete-event-google-calendar-node";
import { GetEventGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/get-event-google-calendar-node";
import { ListCalendarsGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/list-calendars-google-calendar-node";
import { ListEventsGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/list-events-google-calendar-node";
import { QuickAddGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/quick-add-google-calendar-node";
import { SearchEventsGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/search-events-google-calendar-node";
import { UpdateEventGoogleCalendarNode } from "@dafthunk/runtime/nodes/google-calendar/update-event-google-calendar-node";
// import { ArchiveMessageGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/archive-message-google-mail-node";
// import { CheckDraftGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/check-draft-google-mail-node";
// import { CreateReplyDraftGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/create-reply-draft-google-mail-node";
// import { DeleteDraftGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/delete-draft-google-mail-node";
// import { GetMessageGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/get-message-google-mail-node";
// import { MarkMessageGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/mark-message-google-mail-node";
// import { ModifyLabelsGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/modify-labels-google-mail-node";
// import { ReadInboxGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/read-inbox-google-mail-node";
// import { SearchMessagesGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/search-messages-google-mail-node";
// import { SendDraftGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/send-draft-google-mail-node";
import { SendEmailGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/send-email-google-mail-node";
// import { TrashMessageGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/trash-message-google-mail-node";
// import { UpdateDraftGoogleMailNode } from "@dafthunk/runtime/nodes/google-mail/update-draft-google-mail-node";
import { HttpRequestNode } from "@dafthunk/runtime/nodes/http/http-request-node";
import { HttpResponseNode } from "@dafthunk/runtime/nodes/http/http-response-node";
import { JsonBodyNode } from "@dafthunk/runtime/nodes/http/json-body-node";
import { TestAllTypesNode } from "@dafthunk/runtime/nodes/http/test-all-types-node";
import { DetrResnet50Node } from "@dafthunk/runtime/nodes/image/detr-resnet50-node";
import { DreamShaper8LCMNode } from "@dafthunk/runtime/nodes/image/dream-shaper8-lcm-node";
import { ExifReaderNode } from "@dafthunk/runtime/nodes/image/exif-reader-node";
import { Flux1SchnellNode } from "@dafthunk/runtime/nodes/image/flux-1-schnell-node";
import { ImageUrlLoaderNode } from "@dafthunk/runtime/nodes/image/image-url-loader-node";
import { LLaVA157BHFNode } from "@dafthunk/runtime/nodes/image/llava1-5-7b-hf-node";
import { PhotonAddNoiseNode } from "@dafthunk/runtime/nodes/image/photon-add-noise-node";
import { PhotonAdjustBrightnessNode } from "@dafthunk/runtime/nodes/image/photon-adjust-brightness-node";
import { PhotonAdjustContrastNode } from "@dafthunk/runtime/nodes/image/photon-adjust-contrast-node";
import { PhotonAdjustHslLightnessNode } from "@dafthunk/runtime/nodes/image/photon-adjust-hsl-lightness-node";
import { PhotonAdjustHueNode } from "@dafthunk/runtime/nodes/image/photon-adjust-hue-node";
import { PhotonAdjustSaturationNode } from "@dafthunk/runtime/nodes/image/photon-adjust-saturation-node";
import { PhotonAlterRGBChannelsNode } from "@dafthunk/runtime/nodes/image/photon-alter-rgb-channels-node";
import { PhotonApplyFilterNode } from "@dafthunk/runtime/nodes/image/photon-apply-filter-node";
import { PhotonBlendImagesNode } from "@dafthunk/runtime/nodes/image/photon-blend-images-node";
import { PhotonCropNode } from "@dafthunk/runtime/nodes/image/photon-crop-node";
import { PhotonEdgeDetectionNode } from "@dafthunk/runtime/nodes/image/photon-edge-detection-node";
import { PhotonEmbossNode } from "@dafthunk/runtime/nodes/image/photon-emboss-node";
import { PhotonFlipImageNode } from "@dafthunk/runtime/nodes/image/photon-flip-image-node";
import { PhotonGaussianBlurNode } from "@dafthunk/runtime/nodes/image/photon-gaussian-blur-node";
import { PhotonGrayscaleNode } from "@dafthunk/runtime/nodes/image/photon-grayscale-node";
import { PhotonImageInfoNode } from "@dafthunk/runtime/nodes/image/photon-image-info-node";
import { PhotonInvertColorsNode } from "@dafthunk/runtime/nodes/image/photon-invert-colors-node";
import { PhotonMixWithColorNode } from "@dafthunk/runtime/nodes/image/photon-mix-with-color-node";
import { PhotonOilPaintingNode } from "@dafthunk/runtime/nodes/image/photon-oil-painting-node";
import { PhotonPixelizeNode } from "@dafthunk/runtime/nodes/image/photon-pixelize-node";
import { PhotonResizeNode } from "@dafthunk/runtime/nodes/image/photon-resize-node";
import { PhotonRotateImageNode } from "@dafthunk/runtime/nodes/image/photon-rotate-image-node";
import { PhotonSepiaNode } from "@dafthunk/runtime/nodes/image/photon-sepia-node";
import { PhotonSharpenNode } from "@dafthunk/runtime/nodes/image/photon-sharpen-node";
import { PhotonThresholdNode } from "@dafthunk/runtime/nodes/image/photon-threshold-node";
import { PhotonWatermarkNode } from "@dafthunk/runtime/nodes/image/photon-watermark-node";
import { Recraft20bNode } from "@dafthunk/runtime/nodes/image/recraft-20b";
import { Recraft20bSvgNode } from "@dafthunk/runtime/nodes/image/recraft-20b-svg";
import { RecraftCreativeUpscaleNode } from "@dafthunk/runtime/nodes/image/recraft-creative-upscale";
import { RecraftCrispUpscaleNode } from "@dafthunk/runtime/nodes/image/recraft-crisp-upscale";
import { RecraftRemoveBackgroundNode } from "@dafthunk/runtime/nodes/image/recraft-remove-background";
import { RecraftV3Node } from "@dafthunk/runtime/nodes/image/recraft-v3";
import { RecraftV3SvgNode } from "@dafthunk/runtime/nodes/image/recraft-v3-svg";
import { RecraftV4Node } from "@dafthunk/runtime/nodes/image/recraft-v4";
import { RecraftV4ProNode } from "@dafthunk/runtime/nodes/image/recraft-v4-pro";
import { RecraftV4ProSvgNode } from "@dafthunk/runtime/nodes/image/recraft-v4-pro-svg";
import { RecraftV4SvgNode } from "@dafthunk/runtime/nodes/image/recraft-v4-svg";
import { RecraftVectorizeNode } from "@dafthunk/runtime/nodes/image/recraft-vectorize";
import { Resnet50Node } from "@dafthunk/runtime/nodes/image/resnet-50-node";
import { StableDiffusionV15Img2ImgNode } from "@dafthunk/runtime/nodes/image/stable-diffusion-v1-5-img2-img-node";
import { StableDiffusionV15InpaintingNode } from "@dafthunk/runtime/nodes/image/stable-diffusion-v1-5-inpainting-node";
import { StableDiffusionXLBase10Node } from "@dafthunk/runtime/nodes/image/stable-diffusion-xl-base-1-0-node";
import { StableDiffusionXLLightningNode } from "@dafthunk/runtime/nodes/image/stable-diffusion-xl-lightning-node";
// import { SvgToPngNode } from "@dafthunk/runtime/nodes/image/svg-to-png-node";
import { UformGen2Qwen500mNode } from "@dafthunk/runtime/nodes/image/uform-gen2-qwen-500m-node";
import { AudioInputNode } from "@dafthunk/runtime/nodes/input/audio-input-node";
import { AudioRecorderInputNode } from "@dafthunk/runtime/nodes/input/audio-recorder-input-node";
import { BlobInputNode } from "@dafthunk/runtime/nodes/input/blob-input-node";
import { BooleanInputNode } from "@dafthunk/runtime/nodes/input/boolean-input-node";
import { CanvasInputNode } from "@dafthunk/runtime/nodes/input/canvas-input-node";
import { DateInputNode } from "@dafthunk/runtime/nodes/input/date-input-node";
import { DocumentInputNode } from "@dafthunk/runtime/nodes/input/document-input-node";
import { GeoJSONInputNode } from "@dafthunk/runtime/nodes/input/geojson-input-node";
import { GltfInputNode } from "@dafthunk/runtime/nodes/input/gltf-input-node";
import { ImageInputNode } from "@dafthunk/runtime/nodes/input/image-input-node";
import { JavaScriptInputNode } from "@dafthunk/runtime/nodes/input/javascript-input-node";
import { JsonInputNode } from "@dafthunk/runtime/nodes/input/json-input-node";
import { NumberInputNode } from "@dafthunk/runtime/nodes/input/number-input-node";
import { SecretInputNode } from "@dafthunk/runtime/nodes/input/secret-input-node";
import { SliderInputNode } from "@dafthunk/runtime/nodes/input/slider-input-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { WebcamInputNode } from "@dafthunk/runtime/nodes/input/webcam-input-node";
import { JavascriptScriptNode } from "@dafthunk/runtime/nodes/javascript/javascript-script-node";
import { JsonAggNode } from "@dafthunk/runtime/nodes/json/json-agg-node";
import { JsonArrayLengthNode } from "@dafthunk/runtime/nodes/json/json-array-length-node";
import { JsonContainsNode } from "@dafthunk/runtime/nodes/json/json-contains-node";
import { JsonContainsPathNode } from "@dafthunk/runtime/nodes/json/json-contains-path-node";
import { JsonExecuteJavascriptNode } from "@dafthunk/runtime/nodes/json/json-execute-javascript-node";
import { JsonExtractAllNode } from "@dafthunk/runtime/nodes/json/json-extract-all-node";
import { JsonExtractBooleanNode } from "@dafthunk/runtime/nodes/json/json-extract-boolean-node";
import { JsonExtractNumberNode } from "@dafthunk/runtime/nodes/json/json-extract-number-node";
import { JsonExtractObjectNode } from "@dafthunk/runtime/nodes/json/json-extract-object-node";
import { JsonExtractStringNode } from "@dafthunk/runtime/nodes/json/json-extract-string-node";
import { JsonFlattenNode } from "@dafthunk/runtime/nodes/json/json-flatten-node";
import { JsonInsertNode } from "@dafthunk/runtime/nodes/json/json-insert-node";
import { JsonKeysNode } from "@dafthunk/runtime/nodes/json/json-keys-node";
import { JsonMergeNode } from "@dafthunk/runtime/nodes/json/json-merge-node";
import { JsonObjectAggNode } from "@dafthunk/runtime/nodes/json/json-object-agg-node";
import { JsonObjectKeysNode } from "@dafthunk/runtime/nodes/json/json-object-keys-node";
import { JsonObjectValuesNode } from "@dafthunk/runtime/nodes/json/json-object-values-node";
import { JsonRemoveNode } from "@dafthunk/runtime/nodes/json/json-remove-node";
import { JsonReplaceNode } from "@dafthunk/runtime/nodes/json/json-replace-node";
import { JsonSetNode } from "@dafthunk/runtime/nodes/json/json-set-node";
import { JsonStripNullsNode } from "@dafthunk/runtime/nodes/json/json-strip-nulls-node";
import { JsonTemplateNode } from "@dafthunk/runtime/nodes/json/json-template-node";
import { JsonToGeojsonNode } from "@dafthunk/runtime/nodes/json/json-to-geojson-node";
import { JsonTypeofNode } from "@dafthunk/runtime/nodes/json/json-typeof-node";
import { JsonValidNode } from "@dafthunk/runtime/nodes/json/json-valid-node";
import { CommentOnPostLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/comment-on-post-linkedin-node";
import { GetPostCommentsLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/get-post-comments-linkedin-node";
import { GetPostLikesLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/get-post-likes-linkedin-node";
import { GetProfileLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/get-profile-linkedin-node";
import { LikePostLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/like-post-linkedin-node";
import { SharePostLinkedInNode } from "@dafthunk/runtime/nodes/linkedin/share-post-linkedin-node";
import { ConditionalForkNode } from "@dafthunk/runtime/nodes/logic/conditional-fork-node";
import { ConditionalJoinNode } from "@dafthunk/runtime/nodes/logic/conditional-join-node";
import { AbsoluteValueNode } from "@dafthunk/runtime/nodes/math/absolute-value-node";
import { AdditionNode } from "@dafthunk/runtime/nodes/math/addition-node";
import { AvgNode } from "@dafthunk/runtime/nodes/math/avg-node";
import { CalculatorNode } from "@dafthunk/runtime/nodes/math/calculator-node";
import { DivisionNode } from "@dafthunk/runtime/nodes/math/division-node";
import { ExponentiationNode } from "@dafthunk/runtime/nodes/math/exponentiation-node";
import { MaxNode } from "@dafthunk/runtime/nodes/math/max-node";
import { MedianNode } from "@dafthunk/runtime/nodes/math/median-node";
import { MinNode } from "@dafthunk/runtime/nodes/math/min-node";
import { ModuloNode } from "@dafthunk/runtime/nodes/math/modulo-node";
import { MultiplicationNode } from "@dafthunk/runtime/nodes/math/multiplication-node";
import { SquareRootNode } from "@dafthunk/runtime/nodes/math/square-root-node";
import { SubtractionNode } from "@dafthunk/runtime/nodes/math/subtraction-node";
import { SumNode } from "@dafthunk/runtime/nodes/math/sum-node";
import { Gpt5MiniNode } from "@dafthunk/runtime/nodes/openai/gpt-5-mini-node";
import { Gpt5NanoNode } from "@dafthunk/runtime/nodes/openai/gpt-5-nano-node";
import { Gpt5Node } from "@dafthunk/runtime/nodes/openai/gpt-5-node";
import { Gpt41Node } from "@dafthunk/runtime/nodes/openai/gpt-41-node";
import { GptOss20BNode } from "@dafthunk/runtime/nodes/openai/gpt-oss-20b-node";
import { GptOss120BNode } from "@dafthunk/runtime/nodes/openai/gpt-oss-120b-node";
import { AnyOutputNode } from "@dafthunk/runtime/nodes/output/any-output-node";
import { AudioOutputNode } from "@dafthunk/runtime/nodes/output/audio-output-node";
import { BlobOutputNode } from "@dafthunk/runtime/nodes/output/blob-output-node";
import { BooleanOutputNode } from "@dafthunk/runtime/nodes/output/boolean-output-node";
import { DateOutputNode } from "@dafthunk/runtime/nodes/output/date-output-node";
import { DocumentOutputNode } from "@dafthunk/runtime/nodes/output/document-output-node";
import { GeoJSONOutputNode } from "@dafthunk/runtime/nodes/output/geojson-output-node";
import { GltfOutputNode } from "@dafthunk/runtime/nodes/output/gltf-output-node";
import { ImageOutputNode } from "@dafthunk/runtime/nodes/output/image-output-node";
import { JsonOutputNode } from "@dafthunk/runtime/nodes/output/json-output-node";
import { NumberOutputNode } from "@dafthunk/runtime/nodes/output/number-output-node";
import { SecretOutputNode } from "@dafthunk/runtime/nodes/output/secret-output-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import { ReceiveQueueMessageNode } from "@dafthunk/runtime/nodes/queue/receive-queue-message-node";
import { SendQueueBatchNode } from "@dafthunk/runtime/nodes/queue/send-queue-batch-node";
import { SendQueueMessageNode } from "@dafthunk/runtime/nodes/queue/send-queue-message-node";
import { RandomChoiceNode } from "@dafthunk/runtime/nodes/random/random-choice-node";
import { RandomNumberNode } from "@dafthunk/runtime/nodes/random/random-number-node";
import { RandomStringNode } from "@dafthunk/runtime/nodes/random/random-string-node";
import { RandomUuidNode } from "@dafthunk/runtime/nodes/random/random-uuid-node";
import { GetPostRedditNode } from "@dafthunk/runtime/nodes/reddit/get-post-reddit-node";
import { GetSubredditRedditNode } from "@dafthunk/runtime/nodes/reddit/get-subreddit-reddit-node";
import { GetUserRedditNode } from "@dafthunk/runtime/nodes/reddit/get-user-reddit-node";
import { ListCommentsRedditNode } from "@dafthunk/runtime/nodes/reddit/list-comments-reddit-node";
import { ListPostsRedditNode } from "@dafthunk/runtime/nodes/reddit/list-posts-reddit-node";
import { ListUserCommentsRedditNode } from "@dafthunk/runtime/nodes/reddit/list-user-comments-reddit-node";
import { ListUserPostsRedditNode } from "@dafthunk/runtime/nodes/reddit/list-user-posts-reddit-node";
import { SearchRedditNode } from "@dafthunk/runtime/nodes/reddit/search-reddit-node";
import { SearchSubredditsRedditNode } from "@dafthunk/runtime/nodes/reddit/search-subreddits-reddit-node";
import { SubmitCommentRedditNode } from "@dafthunk/runtime/nodes/reddit/submit-comment-reddit-node";
import { SubmitPostRedditNode } from "@dafthunk/runtime/nodes/reddit/submit-post-reddit-node";
import { VoteRedditNode } from "@dafthunk/runtime/nodes/reddit/vote-reddit-node";
import { ReceiveScheduledTriggerNode } from "@dafthunk/runtime/nodes/scheduled/receive-scheduled-trigger-node";
import { BartLargeCnnNode } from "@dafthunk/runtime/nodes/text/bart-large-cnn-node";
import { BgeRerankerBaseNode } from "@dafthunk/runtime/nodes/text/bge-reranker-base-node";
import { DeepseekR1DistillQwen32BNode } from "@dafthunk/runtime/nodes/text/deepseek-r1-distill-qwen-32b-node";
import { DistilbertSst2Int8Node } from "@dafthunk/runtime/nodes/text/distilbert-sst-2-int8-node";
import { Glm47FlashNode } from "@dafthunk/runtime/nodes/text/glm-4-7-flash-node";
import { Hermes2ProMistral7BNode } from "@dafthunk/runtime/nodes/text/hermes-2-pro-mistral-7b-node";
import { Llama318BInstructFastNode } from "@dafthunk/runtime/nodes/text/llama-3-1-8b-instruct-fast-node";
import { Llama3370BInstructFastNode } from "@dafthunk/runtime/nodes/text/llama-3-3-70b-instruct-fp8-fast-node";
import { Llama4Scout17B16EInstructNode } from "@dafthunk/runtime/nodes/text/llama-4-scout-17b-16e-instruct-node";
import { M2m10012bNode } from "@dafthunk/runtime/nodes/text/m2m100-1-2b-node";
import { MistralSmall31_24BInstructNode } from "@dafthunk/runtime/nodes/text/mistral-small-3-1-24b-instruct-node";
import { MultiVariableStringTemplateNode } from "@dafthunk/runtime/nodes/text/multi-variable-string-template-node";
import { Qwen330BA3BFp8Node } from "@dafthunk/runtime/nodes/text/qwen3-30b-a3b-fp8-node";
import { Qwq32BNode } from "@dafthunk/runtime/nodes/text/qwq-32b-node";
import { RegexExtractNode } from "@dafthunk/runtime/nodes/text/regex-extract-node";
import { RegexMatchNode } from "@dafthunk/runtime/nodes/text/regex-match-node";
import { RegexReplaceNode } from "@dafthunk/runtime/nodes/text/regex-replace-node";
import { RegexSplitNode } from "@dafthunk/runtime/nodes/text/regex-split-node";
import { SingleVariableStringTemplateNode } from "@dafthunk/runtime/nodes/text/single-variable-string-template-node";
import { StringConcatNode } from "@dafthunk/runtime/nodes/text/string-concat-node";
import { StringIncludesNode } from "@dafthunk/runtime/nodes/text/string-includes-node";
import { StringIndexOfNode } from "@dafthunk/runtime/nodes/text/string-index-of-node";
import { StringLastIndexOfNode } from "@dafthunk/runtime/nodes/text/string-last-index-of-node";
import { StringNormalizeNode } from "@dafthunk/runtime/nodes/text/string-normalize-node";
import { StringSubstringNode } from "@dafthunk/runtime/nodes/text/string-substring-node";
import { StringToLowerCaseNode } from "@dafthunk/runtime/nodes/text/string-to-lower-case-node";
import { StringToUpperCaseNode } from "@dafthunk/runtime/nodes/text/string-to-upper-case-node";
import { StringTrimNode } from "@dafthunk/runtime/nodes/text/string-trim-node";
import { ToJsonNode } from "@dafthunk/runtime/nodes/text/to-json-node";
import { ToStringNode } from "@dafthunk/runtime/nodes/text/to-string-node";
import { TwilioSmsNode } from "@dafthunk/runtime/nodes/text/twilio-sms-node";
import type { Bindings } from "../context";

export class CloudflareNodeRegistry extends BaseNodeRegistry<Bindings> {
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
    this.registerImplementation(Glm47FlashNode);
    this.registerImplementation(Qwq32BNode);
    this.registerImplementation(Qwen330BA3BFp8Node);
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
    this.registerImplementation(RecraftV4Node);
    this.registerImplementation(RecraftV4ProNode);
    this.registerImplementation(RecraftV4ProSvgNode);
    this.registerImplementation(RecraftV4SvgNode);
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
      // if (this.developerMode) {
      //   this.registerImplementation(CreateReplyDraftGoogleMailNode);
      //   this.registerImplementation(CheckDraftGoogleMailNode);
      //   this.registerImplementation(SendDraftGoogleMailNode);
      //   this.registerImplementation(DeleteDraftGoogleMailNode);
      //   this.registerImplementation(UpdateDraftGoogleMailNode);
      //   this.registerImplementation(ReadInboxGoogleMailNode);
      //   this.registerImplementation(MarkMessageGoogleMailNode);
      //   this.registerImplementation(ModifyLabelsGoogleMailNode);
      //   this.registerImplementation(SearchMessagesGoogleMailNode);
      //   this.registerImplementation(GetMessageGoogleMailNode);
      //   this.registerImplementation(ArchiveMessageGoogleMailNode);
      //   this.registerImplementation(TrashMessageGoogleMailNode);
      // }
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
      this.registerImplementation(GetPostRedditNode);
      this.registerImplementation(GetSubredditRedditNode);
      this.registerImplementation(GetUserRedditNode);
      this.registerImplementation(ListCommentsRedditNode);
      this.registerImplementation(ListPostsRedditNode);
      this.registerImplementation(ListUserCommentsRedditNode);
      this.registerImplementation(ListUserPostsRedditNode);
      this.registerImplementation(SearchRedditNode);
      this.registerImplementation(SearchSubredditsRedditNode);
      this.registerImplementation(SubmitCommentRedditNode);
      this.registerImplementation(SubmitPostRedditNode);
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
    this.registerImplementation(DatasetAiSearchNode);
    this.registerImplementation(DatasetDeleteFileNode);
    this.registerImplementation(DatasetDownloadFileNode);
    this.registerImplementation(DatasetListFilesNode);
    this.registerImplementation(DatasetSearchNode);
    this.registerImplementation(DatasetUploadFileNode);

    // 3D Tiles workflow nodes
    // if (this.developerMode) {
    //   this.registerImplementation(DemToGltfNode);
    //   this.registerImplementation(GeoTiffDemQueryNode);
    //   this.registerImplementation(GeoTiffMetadataReaderNode);
    //   this.registerImplementation(GeoTiffQueryNode);
    //   this.registerImplementation(GeoTiffTransformNode);
    //   this.registerImplementation(GltfWireframeNode);
    // }

    // CSG geometry nodes
    // if (this.developerMode) {
    //   // CSG Primitives
    //   this.registerImplementation(CgsCubeNode);
    //   this.registerImplementation(CgsSphereNode);
    //   this.registerImplementation(CgsCylinderNode);
    //   this.registerImplementation(CgsConeNode);
    //   this.registerImplementation(CgsTorusNode);

    //   // CSG Operations
    //   this.registerImplementation(CgsUnionNode);
    //   this.registerImplementation(CgsDifferenceNode);
    //   this.registerImplementation(CgsIntersectionNode);
    //   this.registerImplementation(CgsXorNode);

    //   // CSG Material & Texture
    //   this.registerImplementation(CgsApplyMaterialNode);
    //   this.registerImplementation(CgsApplyTextureNode);

    //   // CSG Transformations
    //   this.registerImplementation(CgsTranslateNode);
    //   this.registerImplementation(CgsRotateNode);
    //   this.registerImplementation(CgsScaleNode);
    // }

    // Geo nodes
    // if (this.developerMode) {
    //   this.registerImplementation(AlongNode);
    //   this.registerImplementation(AngleNode);
    //   this.registerImplementation(AreaNode);
    //   this.registerImplementation(BboxClipNode);
    //   this.registerImplementation(BboxNode);
    //   this.registerImplementation(BboxPolygonNode);
    //   this.registerImplementation(BearingNode);
    //   this.registerImplementation(BooleanClockwiseNode);
    //   this.registerImplementation(BooleanConcaveNode);
    //   this.registerImplementation(BooleanContainsNode);
    //   this.registerImplementation(BooleanCrossesNode);
    //   this.registerImplementation(BooleanDisjointNode);
    //   this.registerImplementation(BooleanEqualNode);
    //   this.registerImplementation(BooleanIntersectsNode);
    //   this.registerImplementation(BooleanOverlapNode);
    //   this.registerImplementation(BooleanParallelNode);
    //   this.registerImplementation(BooleanPointInPolygonNode);
    //   this.registerImplementation(BooleanPointOnLineNode);
    //   this.registerImplementation(BooleanTouchesNode);
    //   this.registerImplementation(BooleanValidNode);
    //   this.registerImplementation(BooleanWithinNode);
    //   this.registerImplementation(BufferNode);
    //   this.registerImplementation(CenterMeanNode);
    //   this.registerImplementation(CenterMedianNode);
    //   this.registerImplementation(CenterNode);
    //   this.registerImplementation(CenterOfMassNode);
    //   this.registerImplementation(CentroidNode);
    //   this.registerImplementation(CircleNode);
    //   this.registerImplementation(CleanCoordsNode);
    //   this.registerImplementation(CombineNode);
    //   this.registerImplementation(ConcaveNode);
    //   this.registerImplementation(ConvexNode);
    //   this.registerImplementation(DestinationNode);
    //   this.registerImplementation(DifferenceNode);
    //   this.registerImplementation(DistanceNode);
    //   this.registerImplementation(EnvelopeNode);
    //   this.registerImplementation(ExplodeNode);
    //   this.registerImplementation(FeatureCollectionNode);
    //   this.registerImplementation(FeatureNode);
    //   this.registerImplementation(FlattenNode);
    //   this.registerImplementation(FlipNode);
    //   this.registerImplementation(GeometryCollectionNode);
    //   this.registerImplementation(GeoJsonNode);
    //   this.registerImplementation(GeoJsonToSvgNode);
    //   this.registerImplementation(GreatCircleNode);
    //   this.registerImplementation(IntersectNode);
    //   this.registerImplementation(KinksNode);
    //   this.registerImplementation(LengthNode);
    //   this.registerImplementation(LineArcNode);
    //   this.registerImplementation(LineChunkNode);
    //   this.registerImplementation(LineIntersectNode);
    //   this.registerImplementation(LineOffsetNode);
    //   this.registerImplementation(LineOverlapNode);
    //   this.registerImplementation(LineSegmentNode);
    //   this.registerImplementation(LineSliceAlongNode);
    //   this.registerImplementation(LineSliceNode);
    //   this.registerImplementation(LineSplitNode);
    //   this.registerImplementation(LineStringNode);
    //   this.registerImplementation(LineToPolygonNode);
    //   this.registerImplementation(MaskNode);
    //   this.registerImplementation(MidpointNode);
    //   this.registerImplementation(MultiLineStringNode);
    //   this.registerImplementation(MultiPointNode);
    //   this.registerImplementation(MultiPolygonNode);
    //   this.registerImplementation(NearestPointNode);
    //   this.registerImplementation(NearestPointOnLineNode);
    //   this.registerImplementation(PointNode);
    //   this.registerImplementation(PointOnFeatureNode);
    //   this.registerImplementation(PointToLineDistanceNode);
    //   this.registerImplementation(PointToPolygonDistanceNode);
    //   this.registerImplementation(PolygonNode);
    //   this.registerImplementation(PolygonSmoothNode);
    //   this.registerImplementation(PolygonTangentsNode);
    //   this.registerImplementation(PolygonToLineNode);
    //   this.registerImplementation(PolygonizeNode);
    //   this.registerImplementation(SvgToPngNode);
    //   this.registerImplementation(RewindNode);
    //   this.registerImplementation(RhumbBearingNode);
    //   this.registerImplementation(RhumbDestinationNode);
    //   this.registerImplementation(RhumbDistanceNode);
    //   this.registerImplementation(RoundNode);
    //   this.registerImplementation(SectorNode);
    //   this.registerImplementation(ShortestPathNode);
    //   this.registerImplementation(SimplifyNode);
    //   this.registerImplementation(SquareNode);
    //   this.registerImplementation(TransformRotateNode);
    //   this.registerImplementation(TransformScaleNode);
    //   this.registerImplementation(TransformTranslateNode);
    //   this.registerImplementation(TruncateNode);
    //   this.registerImplementation(UnionNode);
    //   this.registerImplementation(UnkinkPolygonNode);
    //   this.registerImplementation(VoronoiNode);
    //   this.registerImplementation(WktGeometryNode);
    // }

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
    this.registerImplementation(Gemini25FlashAudioUnderstandingNode);
    this.registerImplementation(Gemini25ProAudioUnderstandingNode);
    this.registerImplementation(Gemini25FlashImageUnderstandingNode);
    this.registerImplementation(Gemini25ProImageUnderstandingNode);
    this.registerImplementation(Gemini25FlashTtsNode);
    this.registerImplementation(ImagenNode);

    // 3D generation nodes - always register (users can provide API keys via secrets)
    if (this.developerMode) {
      this.registerImplementation(TrellisNode);
      this.registerImplementation(Trellis2Node);
    }

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

    // Agent nodes — multi-turn agentic execution via Durable Object
    this.registerImplementation(AgentClaudeSonnet4Node);
    this.registerImplementation(AgentGemini25FlashNode);
    this.registerImplementation(AgentGpt41Node);
    this.registerImplementation(AgentQwen330BA3BFp8Node);
  }
}
