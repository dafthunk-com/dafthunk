import {
  BaseNodeRegistry,
  FailingMultiStepNode,
  MultiStepAdditionNode,
} from "@dafthunk/runtime";
import { CgsApplyMaterialNode } from "@dafthunk/runtime/nodes/3d/cgs-apply-material-node";
import { CgsApplyTextureNode } from "@dafthunk/runtime/nodes/3d/cgs-apply-texture-node";
import { CgsConeNode } from "@dafthunk/runtime/nodes/3d/cgs-cone-node";
import { CgsCubeNode } from "@dafthunk/runtime/nodes/3d/cgs-cube-node";
import { CgsCylinderNode } from "@dafthunk/runtime/nodes/3d/cgs-cylinder-node";
import { CgsDifferenceNode } from "@dafthunk/runtime/nodes/3d/cgs-difference-node";
import { CgsIntersectionNode } from "@dafthunk/runtime/nodes/3d/cgs-intersection-node";
import { CgsRotateNode } from "@dafthunk/runtime/nodes/3d/cgs-rotate-node";
import { CgsScaleNode } from "@dafthunk/runtime/nodes/3d/cgs-scale-node";
import { CgsSphereNode } from "@dafthunk/runtime/nodes/3d/cgs-sphere-node";
import { CgsTorusNode } from "@dafthunk/runtime/nodes/3d/cgs-torus-node";
import { CgsTranslateNode } from "@dafthunk/runtime/nodes/3d/cgs-translate-node";
import { CgsUnionNode } from "@dafthunk/runtime/nodes/3d/cgs-union-node";
import { CgsXorNode } from "@dafthunk/runtime/nodes/3d/cgs-xor-node";
import { DemToGltfNode } from "@dafthunk/runtime/nodes/3d/dem-to-gltf-node";
import { GeoTiffDemQueryNode } from "@dafthunk/runtime/nodes/3d/geotiff-dem-query-node";
import { GeoTiffMetadataReaderNode } from "@dafthunk/runtime/nodes/3d/geotiff-metadata-reader-node";
import { GeoTiffQueryNode } from "@dafthunk/runtime/nodes/3d/geotiff-query-node";
import { GeoTiffTransformNode } from "@dafthunk/runtime/nodes/3d/geotiff-transform-node";
import { GltfWireframeNode } from "@dafthunk/runtime/nodes/3d/gltf-wireframe-node";
import { AgentClaudeSonnet4Node } from "@dafthunk/runtime/nodes/agent/agent-claude-sonnet-4-node";
import { AgentGemini25FlashNode } from "@dafthunk/runtime/nodes/agent/agent-gemini-2-5-flash-node";
import { AgentGemini31ProNode } from "@dafthunk/runtime/nodes/agent/agent-gemini-3-1-pro-node";
import { AgentGemini3FlashNode } from "@dafthunk/runtime/nodes/agent/agent-gemini-3-flash-node";
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
import { BlobToFormDataNode } from "@dafthunk/runtime/nodes/blob/blob-to-form-data-node";
import { BlobToJsonNode } from "@dafthunk/runtime/nodes/blob/blob-to-json-node";
import { BlobToTextNode } from "@dafthunk/runtime/nodes/blob/blob-to-text-node";
import { FileNode } from "@dafthunk/runtime/nodes/blob/file-node";
import { JsonToBlobNode } from "@dafthunk/runtime/nodes/blob/json-to-blob-node";
import { TextToBlobNode } from "@dafthunk/runtime/nodes/blob/text-to-blob-node";
import { CloudflareBrowserContentNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-content-node";
import { CloudflareBrowserCrawlNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-crawl-node";
import { CloudflareBrowserCrawlQueueNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-crawl-queue-node";
import { CloudflareBrowserJsonNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-json-node";
import { CloudflareBrowserLinksNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-links-node";
import { CloudflareBrowserMarkdownNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-markdown-node";
import { CloudflareBrowserPdfNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-pdf-node";
import { CloudflareBrowserScrapeNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-scrape-node";
import { CloudflareBrowserScreenshotNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-screenshot-node";
import { CloudflareBrowserSnapshotNode } from "@dafthunk/runtime/nodes/browser/cloudflare-browser-snapshot-node";
import { CloudflareModelNode } from "@dafthunk/runtime/nodes/cloudflare/cloudflare-model-node";
import { CsvExtractColumnNode } from "@dafthunk/runtime/nodes/csv/csv-extract-column-node";
import { CsvFilterRowsNode } from "@dafthunk/runtime/nodes/csv/csv-filter-rows-node";
import { CsvParseNode } from "@dafthunk/runtime/nodes/csv/csv-parse-node";
import { CsvStringifyNode } from "@dafthunk/runtime/nodes/csv/csv-stringify-node";
import { DatabaseCreateTableNode } from "@dafthunk/runtime/nodes/database/database-create-table-node";
import { DatabaseDeleteRowNode } from "@dafthunk/runtime/nodes/database/database-delete-row-node";
import { DatabaseDescribeTableNode } from "@dafthunk/runtime/nodes/database/database-describe-table-node";
import { DatabaseDropTableNode } from "@dafthunk/runtime/nodes/database/database-drop-table-node";
import { DatabaseExecuteNode } from "@dafthunk/runtime/nodes/database/database-execute-node";
import { DatabaseExportTableNode } from "@dafthunk/runtime/nodes/database/database-export-table-node";
import { DatabaseGetRowCountNode } from "@dafthunk/runtime/nodes/database/database-get-row-count-node";
import { DatabaseGetRowNode } from "@dafthunk/runtime/nodes/database/database-get-row-node";
import { DatabaseImportTableNode } from "@dafthunk/runtime/nodes/database/database-import-table-node";
import { DatabaseListTablesNode } from "@dafthunk/runtime/nodes/database/database-list-tables-node";
import { DatabasePutRowNode } from "@dafthunk/runtime/nodes/database/database-put-row-node";
import { DatabaseQueryNode } from "@dafthunk/runtime/nodes/database/database-query-node";
import { DatabaseRowExistsNode } from "@dafthunk/runtime/nodes/database/database-row-exists-node";
import { DatabaseTableExistsNode } from "@dafthunk/runtime/nodes/database/database-table-exists-node";
import { DatabaseTruncateTableNode } from "@dafthunk/runtime/nodes/database/database-truncate-table-node";
import { ParquetQueryNode } from "@dafthunk/runtime/nodes/database/parquet-query-node";
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
import { BotAddReactionDiscordNode } from "@dafthunk/runtime/nodes/discord/bot-add-reaction-discord-node";
import { BotReceiveDiscordMessageNode } from "@dafthunk/runtime/nodes/discord/bot-receive-discord-message-node";
import { BotSendDMDiscordNode } from "@dafthunk/runtime/nodes/discord/bot-send-dm-discord-node";
import { BotSendMessageDiscordNode } from "@dafthunk/runtime/nodes/discord/bot-send-message-discord-node";
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
import { Gemini31FlashImagePreviewNode } from "@dafthunk/runtime/nodes/gemini/gemini-3-1-flash-image-preview-node";
import { Gemini31ProNode } from "@dafthunk/runtime/nodes/gemini/gemini-3-1-pro-node";
import { Gemini3FlashNode } from "@dafthunk/runtime/nodes/gemini/gemini-3-flash-node";
import { Gemini3ProImagePreviewNode } from "@dafthunk/runtime/nodes/gemini/gemini-3-pro-image-preview-node";
import { ImagenNode } from "@dafthunk/runtime/nodes/gemini/imagen-node";
import { AlongNode } from "@dafthunk/runtime/nodes/geo/along-node";
import { AngleNode } from "@dafthunk/runtime/nodes/geo/angle-node";
import { AreaNode } from "@dafthunk/runtime/nodes/geo/area-node";
import { BboxClipNode } from "@dafthunk/runtime/nodes/geo/bbox-clip-node";
import { BboxNode } from "@dafthunk/runtime/nodes/geo/bbox-node";
import { BboxPolygonNode } from "@dafthunk/runtime/nodes/geo/bbox-polygon-node";
import { BearingNode } from "@dafthunk/runtime/nodes/geo/bearing-node";
import { BooleanClockwiseNode } from "@dafthunk/runtime/nodes/geo/boolean-clockwise-node";
import { BooleanConcaveNode } from "@dafthunk/runtime/nodes/geo/boolean-concave-node";
import { BooleanContainsNode } from "@dafthunk/runtime/nodes/geo/boolean-contains-node";
import { BooleanCrossesNode } from "@dafthunk/runtime/nodes/geo/boolean-crosses-node";
import { BooleanDisjointNode } from "@dafthunk/runtime/nodes/geo/boolean-disjoint-node";
import { BooleanEqualNode } from "@dafthunk/runtime/nodes/geo/boolean-equal-node";
import { BooleanIntersectsNode } from "@dafthunk/runtime/nodes/geo/boolean-intersects-node";
import { BooleanOverlapNode } from "@dafthunk/runtime/nodes/geo/boolean-overlap-node";
import { BooleanParallelNode } from "@dafthunk/runtime/nodes/geo/boolean-parallel-node";
import { BooleanPointInPolygonNode } from "@dafthunk/runtime/nodes/geo/boolean-point-in-polygon-node";
import { BooleanPointOnLineNode } from "@dafthunk/runtime/nodes/geo/boolean-point-on-line-node";
import { BooleanTouchesNode } from "@dafthunk/runtime/nodes/geo/boolean-touches-node";
import { BooleanValidNode } from "@dafthunk/runtime/nodes/geo/boolean-valid-node";
import { BooleanWithinNode } from "@dafthunk/runtime/nodes/geo/boolean-within-node";
import { BufferNode } from "@dafthunk/runtime/nodes/geo/buffer-node";
import { CenterMeanNode } from "@dafthunk/runtime/nodes/geo/center-mean-node";
import { CenterMedianNode } from "@dafthunk/runtime/nodes/geo/center-median-node";
import { CenterNode } from "@dafthunk/runtime/nodes/geo/center-node";
import { CenterOfMassNode } from "@dafthunk/runtime/nodes/geo/center-of-mass-node";
import { CentroidNode } from "@dafthunk/runtime/nodes/geo/centroid-node";
import { CircleNode } from "@dafthunk/runtime/nodes/geo/circle-node";
import { CleanCoordsNode } from "@dafthunk/runtime/nodes/geo/clean-coords-node";
import { CombineNode } from "@dafthunk/runtime/nodes/geo/combine-node";
import { ConcaveNode } from "@dafthunk/runtime/nodes/geo/concave-node";
import { ConvexNode } from "@dafthunk/runtime/nodes/geo/convex-node";
import { DestinationNode } from "@dafthunk/runtime/nodes/geo/destination-node";
import { DifferenceNode } from "@dafthunk/runtime/nodes/geo/difference-node";
import { DistanceNode } from "@dafthunk/runtime/nodes/geo/distance-node";
import { EnvelopeNode } from "@dafthunk/runtime/nodes/geo/envelope-node";
import { ExplodeNode } from "@dafthunk/runtime/nodes/geo/explode-node";
import { FeatureCollectionNode } from "@dafthunk/runtime/nodes/geo/feature-collection-node";
import { FeatureNode } from "@dafthunk/runtime/nodes/geo/feature-node";
import { FlattenNode } from "@dafthunk/runtime/nodes/geo/flatten-node";
import { FlipNode } from "@dafthunk/runtime/nodes/geo/flip-node";
import { GeoJsonNode } from "@dafthunk/runtime/nodes/geo/geojson-node";
import { GeoJsonToSvgNode } from "@dafthunk/runtime/nodes/geo/geojson-to-svg-node";
import { GeometryCollectionNode } from "@dafthunk/runtime/nodes/geo/geometry-collection-node";
import { GreatCircleNode } from "@dafthunk/runtime/nodes/geo/great-circle-node";
import { IntersectNode } from "@dafthunk/runtime/nodes/geo/intersect-node";
import { KinksNode } from "@dafthunk/runtime/nodes/geo/kinks-node";
import { LengthNode } from "@dafthunk/runtime/nodes/geo/length-node";
import { LineArcNode } from "@dafthunk/runtime/nodes/geo/line-arc-node";
import { LineChunkNode } from "@dafthunk/runtime/nodes/geo/line-chunk-node";
import { LineIntersectNode } from "@dafthunk/runtime/nodes/geo/line-intersect-node";
import { LineOffsetNode } from "@dafthunk/runtime/nodes/geo/line-offset-node";
import { LineOverlapNode } from "@dafthunk/runtime/nodes/geo/line-overlap-node";
import { LineSegmentNode } from "@dafthunk/runtime/nodes/geo/line-segment-node";
import { LineSliceAlongNode } from "@dafthunk/runtime/nodes/geo/line-slice-along-node";
import { LineSliceNode } from "@dafthunk/runtime/nodes/geo/line-slice-node";
import { LineSplitNode } from "@dafthunk/runtime/nodes/geo/line-split-node";
import { LineToPolygonNode } from "@dafthunk/runtime/nodes/geo/line-to-polygon-node";
import { LineStringNode } from "@dafthunk/runtime/nodes/geo/linestring-node";
import { MaskNode } from "@dafthunk/runtime/nodes/geo/mask-node";
import { MidpointNode } from "@dafthunk/runtime/nodes/geo/midpoint-node";
import { MultiLineStringNode } from "@dafthunk/runtime/nodes/geo/multilinestring-node";
import { MultiPointNode } from "@dafthunk/runtime/nodes/geo/multipoint-node";
import { MultiPolygonNode } from "@dafthunk/runtime/nodes/geo/multipolygon-node";
import { NearestPointNode } from "@dafthunk/runtime/nodes/geo/nearest-point-node";
import { NearestPointOnLineNode } from "@dafthunk/runtime/nodes/geo/nearest-point-on-line-node";
import { PointNode } from "@dafthunk/runtime/nodes/geo/point-node";
import { PointOnFeatureNode } from "@dafthunk/runtime/nodes/geo/point-on-feature-node";
import { PointToLineDistanceNode } from "@dafthunk/runtime/nodes/geo/point-to-line-distance-node";
import { PointToPolygonDistanceNode } from "@dafthunk/runtime/nodes/geo/point-to-polygon-distance-node";
import { PolygonNode } from "@dafthunk/runtime/nodes/geo/polygon-node";
import { PolygonSmoothNode } from "@dafthunk/runtime/nodes/geo/polygon-smooth-node";
import { PolygonTangentsNode } from "@dafthunk/runtime/nodes/geo/polygon-tangents-node";
import { PolygonToLineNode } from "@dafthunk/runtime/nodes/geo/polygon-to-line-node";
import { PolygonizeNode } from "@dafthunk/runtime/nodes/geo/polygonize-node";
import { RewindNode } from "@dafthunk/runtime/nodes/geo/rewind-node";
import { RhumbBearingNode } from "@dafthunk/runtime/nodes/geo/rhumb-bearing-node";
import { RhumbDestinationNode } from "@dafthunk/runtime/nodes/geo/rhumb-destination-node";
import { RhumbDistanceNode } from "@dafthunk/runtime/nodes/geo/rhumb-distance-node";
import { RoundNode } from "@dafthunk/runtime/nodes/geo/round-node";
import { SectorNode } from "@dafthunk/runtime/nodes/geo/sector-node";
import { ShortestPathNode } from "@dafthunk/runtime/nodes/geo/shortest-path-node";
import { SimplifyNode } from "@dafthunk/runtime/nodes/geo/simplify-node";
import { SquareNode } from "@dafthunk/runtime/nodes/geo/square-node";
import { TransformRotateNode } from "@dafthunk/runtime/nodes/geo/transform-rotate-node";
import { TransformScaleNode } from "@dafthunk/runtime/nodes/geo/transform-scale-node";
import { TransformTranslateNode } from "@dafthunk/runtime/nodes/geo/transform-translate-node";
import { TruncateNode } from "@dafthunk/runtime/nodes/geo/truncate-node";
import { UnionNode } from "@dafthunk/runtime/nodes/geo/union-node";
import { UnkinkPolygonNode } from "@dafthunk/runtime/nodes/geo/unkink-polygon-node";
import { VoronoiNode } from "@dafthunk/runtime/nodes/geo/voronoi-node";
import { WktGeometryNode } from "@dafthunk/runtime/nodes/geo/wkt-geometry-node";
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
import { AirQualityGoogleNode } from "@dafthunk/runtime/nodes/google/air-quality-google-node";
import { ElevationGoogleNode } from "@dafthunk/runtime/nodes/google/elevation-google-node";
import { GeocodingGoogleNode } from "@dafthunk/runtime/nodes/google/geocoding-google-node";
import { PlacesGoogleNode } from "@dafthunk/runtime/nodes/google/places-google-node";
import { PollenGoogleNode } from "@dafthunk/runtime/nodes/google/pollen-google-node";
import { TimezoneGoogleNode } from "@dafthunk/runtime/nodes/google/timezone-google-node";
import { WeatherGoogleNode } from "@dafthunk/runtime/nodes/google/weather-google-node";
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
import { HttpWebhookNode } from "@dafthunk/runtime/nodes/http/http-webhook-node";
import { JsonBodyNode } from "@dafthunk/runtime/nodes/http/json-body-node";
import { TestAllTypesNode } from "@dafthunk/runtime/nodes/http/test-all-types-node";
import { ExifReaderNode } from "@dafthunk/runtime/nodes/image/exif-reader-node";
import { ImageUrlLoaderNode } from "@dafthunk/runtime/nodes/image/image-url-loader-node";
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
// import { SvgToPngNode } from "@dafthunk/runtime/nodes/image/svg-to-png-node";
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
import { VideoInputNode } from "@dafthunk/runtime/nodes/input/video-input-node";
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
import { JsonSchemaComposeNode } from "@dafthunk/runtime/nodes/json/json-schema-compose-node";
import { JsonSchemaExtractNode } from "@dafthunk/runtime/nodes/json/json-schema-extract-node";
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
import { CreateFeedbackFormNode } from "@dafthunk/runtime/nodes/logic/create-feedback-form-node";
import { CreateFormNode } from "@dafthunk/runtime/nodes/logic/create-form-node";
import { SwitchForkNode } from "@dafthunk/runtime/nodes/logic/switch-fork-node";
import { SwitchJoinNode } from "@dafthunk/runtime/nodes/logic/switch-join-node";
import { WaitForFormNode } from "@dafthunk/runtime/nodes/logic/wait-for-form-node";
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
import { VideoOutputNode } from "@dafthunk/runtime/nodes/output/video-output-node";
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
import { SharePostRedditNode } from "@dafthunk/runtime/nodes/reddit/share-post-reddit-node";
import { SubmitCommentRedditNode } from "@dafthunk/runtime/nodes/reddit/submit-comment-reddit-node";
import { VoteRedditNode } from "@dafthunk/runtime/nodes/reddit/vote-reddit-node";
import { ReplicateModelNode } from "@dafthunk/runtime/nodes/replicate/replicate-model-node";
import { ReceiveScheduledTriggerNode } from "@dafthunk/runtime/nodes/scheduled/receive-scheduled-trigger-node";
import { BotAddReactionSlackNode } from "@dafthunk/runtime/nodes/slack/bot-add-reaction-slack-node";
import { BotReceiveSlackMessageNode } from "@dafthunk/runtime/nodes/slack/bot-receive-slack-message-node";
import { BotSendMessageSlackNode } from "@dafthunk/runtime/nodes/slack/bot-send-message-slack-node";
import { ExtractTavilyNode } from "@dafthunk/runtime/nodes/tavily/extract-tavily-node";
import { SearchTavilyNode } from "@dafthunk/runtime/nodes/tavily/search-tavily-node";
import { BotForwardMessageTelegramNode } from "@dafthunk/runtime/nodes/telegram/bot-forward-message-telegram-node";
import { BotGetChatTelegramNode } from "@dafthunk/runtime/nodes/telegram/bot-get-chat-telegram-node";
import { BotReceiveTelegramMessageNode } from "@dafthunk/runtime/nodes/telegram/bot-receive-telegram-message-node";
import { BotSendMessageTelegramNode } from "@dafthunk/runtime/nodes/telegram/bot-send-message-telegram-node";
import { BotSendPhotoTelegramNode } from "@dafthunk/runtime/nodes/telegram/bot-send-photo-telegram-node";
import { JsonStringTemplateNode } from "@dafthunk/runtime/nodes/text/json-string-template-node";
import { RegexExtractNode } from "@dafthunk/runtime/nodes/text/regex-extract-node";
import { RegexMatchNode } from "@dafthunk/runtime/nodes/text/regex-match-node";
import { RegexReplaceNode } from "@dafthunk/runtime/nodes/text/regex-replace-node";
import { RegexSplitNode } from "@dafthunk/runtime/nodes/text/regex-split-node";
import { StringConcatNode } from "@dafthunk/runtime/nodes/text/string-concat-node";
import { StringEqualsNode } from "@dafthunk/runtime/nodes/text/string-equals-node";
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
import { VarStringTemplateNode } from "@dafthunk/runtime/nodes/text/var-string-template-node";
import { AppendVideosNode } from "@dafthunk/runtime/nodes/video/append-videos-node";
import { ClipVideoNode } from "@dafthunk/runtime/nodes/video/clip-video-node";
import { ExtractFirstFrameNode } from "@dafthunk/runtime/nodes/video/extract-first-frame-node";
import { ExtractFrameAtTimeNode } from "@dafthunk/runtime/nodes/video/extract-frame-at-time-node";
import { ExtractLastFrameNode } from "@dafthunk/runtime/nodes/video/extract-last-frame-node";
import { BotMarkAsReadWhatsAppNode } from "@dafthunk/runtime/nodes/whatsapp/bot-mark-as-read-whatsapp-node";
import { BotReceiveWhatsAppMessageNode } from "@dafthunk/runtime/nodes/whatsapp/bot-receive-whatsapp-message-node";
import { BotSendImageWhatsAppNode } from "@dafthunk/runtime/nodes/whatsapp/bot-send-image-whatsapp-node";
import { BotSendMessageWhatsAppNode } from "@dafthunk/runtime/nodes/whatsapp/bot-send-message-whatsapp-node";
import { BotSendTemplateWhatsAppNode } from "@dafthunk/runtime/nodes/whatsapp/bot-send-template-whatsapp-node";
import { SearchMediaWikiNode } from "@dafthunk/runtime/nodes/wikipedia/search-mediawiki-node";
import { SearchWikipediaNode } from "@dafthunk/runtime/nodes/wikipedia/search-wikipedia-node";
import { DeletePostXNode } from "@dafthunk/runtime/nodes/x/delete-post-x-node";
import { FollowUserXNode } from "@dafthunk/runtime/nodes/x/follow-user-x-node";
import { GetPostXNode } from "@dafthunk/runtime/nodes/x/get-post-x-node";
import { GetUserXNode } from "@dafthunk/runtime/nodes/x/get-user-x-node";
import { LikePostXNode } from "@dafthunk/runtime/nodes/x/like-post-x-node";
import { ListFollowersXNode } from "@dafthunk/runtime/nodes/x/list-followers-x-node";
import { ListFollowingXNode } from "@dafthunk/runtime/nodes/x/list-following-x-node";
import { ListUserMentionsXNode } from "@dafthunk/runtime/nodes/x/list-user-mentions-x-node";
import { ListUserPostsXNode } from "@dafthunk/runtime/nodes/x/list-user-posts-x-node";
import { RepostXNode } from "@dafthunk/runtime/nodes/x/repost-x-node";
import { SearchPostsXNode } from "@dafthunk/runtime/nodes/x/search-posts-x-node";
import { SharePostXNode } from "@dafthunk/runtime/nodes/x/share-post-x-node";
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
    const hasSendEmail = !!(this.env.SEND_EMAIL && this.env.SEND_EMAIL_FROM);
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
    const hasX = !!(
      this.env.INTEGRATION_X_CLIENT_ID && this.env.INTEGRATION_X_CLIENT_SECRET
    );

    // Register all core nodes
    this.registerImplementation(HttpRequestNode);
    this.registerImplementation(HttpWebhookNode);
    this.registerImplementation(JsonBodyNode);
    this.registerImplementation(TestAllTypesNode);
    this.registerImplementation(SendQueueMessageNode);
    this.registerImplementation(SendQueueBatchNode);
    this.registerImplementation(ReceiveQueueMessageNode);
    this.registerImplementation(DatabaseCreateTableNode);
    this.registerImplementation(DatabaseDeleteRowNode);
    this.registerImplementation(DatabaseDescribeTableNode);
    this.registerImplementation(DatabaseDropTableNode);
    this.registerImplementation(DatabaseExecuteNode);
    this.registerImplementation(DatabaseExportTableNode);
    this.registerImplementation(DatabaseGetRowCountNode);
    this.registerImplementation(DatabaseGetRowNode);
    this.registerImplementation(DatabaseImportTableNode);
    this.registerImplementation(DatabaseListTablesNode);
    this.registerImplementation(DatabasePutRowNode);
    this.registerImplementation(DatabaseQueryNode);
    this.registerImplementation(DatabaseRowExistsNode);
    this.registerImplementation(DatabaseTableExistsNode);
    this.registerImplementation(DatabaseTruncateTableNode);
    this.registerImplementation(ParquetQueryNode);
    this.registerImplementation(ReceiveEmailNode);
    this.registerImplementation(BotReceiveDiscordMessageNode);
    this.registerImplementation(BotReceiveTelegramMessageNode);
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
    this.registerImplementation(ImageUrlLoaderNode);
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
    this.registerImplementation(JsonSchemaComposeNode);
    this.registerImplementation(JsonSchemaExtractNode);
    this.registerImplementation(JsonValidNode);
    this.registerImplementation(JsonStringTemplateNode);
    this.registerImplementation(VarStringTemplateNode);
    this.registerImplementation(JavaScriptInputNode);
    this.registerImplementation(JavascriptScriptNode);
    this.registerImplementation(CanvasInputNode);
    this.registerImplementation(ExifReaderNode);
    this.registerImplementation(WebcamInputNode);

    // String operations
    this.registerImplementation(StringConcatNode);
    this.registerImplementation(StringEqualsNode);
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
    this.registerImplementation(SwitchForkNode);
    this.registerImplementation(SwitchJoinNode);
    this.registerImplementation(CreateFormNode);
    this.registerImplementation(CreateFeedbackFormNode);
    this.registerImplementation(WaitForFormNode);

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

    // Generic Replicate model node
    this.registerImplementation(ReplicateModelNode);

    // Generic Cloudflare Workers AI model node
    this.registerImplementation(CloudflareModelNode);

    // Video processing nodes (Cloudflare Containers)
    if (this.env.FFMPEG_CONTAINER) {
      this.registerImplementation(AppendVideosNode);
      this.registerImplementation(ClipVideoNode);
      this.registerImplementation(ExtractFrameAtTimeNode);
      this.registerImplementation(ExtractFirstFrameNode);
      this.registerImplementation(ExtractLastFrameNode);
    }

    this.registerImplementation(AudioInputNode);
    this.registerImplementation(AudioRecorderInputNode);
    this.registerImplementation(ImageInputNode);
    this.registerImplementation(BlobInputNode);
    this.registerImplementation(DocumentInputNode);
    this.registerImplementation(GltfInputNode);
    this.registerImplementation(GeoJSONInputNode);
    this.registerImplementation(VideoInputNode);
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

    // Search nodes
    this.registerImplementation(SearchWikipediaNode);
    this.registerImplementation(SearchMediaWikiNode);

    // Tavily nodes
    if (this.env.TAVILY_API_KEY) {
      this.registerImplementation(SearchTavilyNode);
      this.registerImplementation(ExtractTavilyNode);
    }

    // Google API nodes
    if (this.env.GOOGLE_API_KEY) {
      this.registerImplementation(AirQualityGoogleNode);
      this.registerImplementation(WeatherGoogleNode);
      this.registerImplementation(PollenGoogleNode);
      this.registerImplementation(ElevationGoogleNode);
      this.registerImplementation(PlacesGoogleNode);
      this.registerImplementation(GeocodingGoogleNode);
      this.registerImplementation(TimezoneGoogleNode);
    }

    // Specification test nodes (multi-step)
    this.registerImplementation(MultiStepAdditionNode);
    this.registerImplementation(FailingMultiStepNode);

    // Conditional registrations based on environment
    if (hasCloudflare) {
      this.registerImplementation(CloudflareBrowserContentNode);
      this.registerImplementation(CloudflareBrowserCrawlNode);
      this.registerImplementation(CloudflareBrowserCrawlQueueNode);
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

    if (hasSendEmail) {
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

    this.registerImplementation(BotSendMessageDiscordNode);
    this.registerImplementation(BotSendDMDiscordNode);
    this.registerImplementation(BotAddReactionDiscordNode);

    this.registerImplementation(BotSendMessageTelegramNode);
    this.registerImplementation(BotSendPhotoTelegramNode);
    this.registerImplementation(BotForwardMessageTelegramNode);
    this.registerImplementation(BotGetChatTelegramNode);

    this.registerImplementation(BotReceiveWhatsAppMessageNode);
    this.registerImplementation(BotSendMessageWhatsAppNode);
    this.registerImplementation(BotSendImageWhatsAppNode);
    this.registerImplementation(BotSendTemplateWhatsAppNode);
    this.registerImplementation(BotMarkAsReadWhatsAppNode);

    this.registerImplementation(BotReceiveSlackMessageNode);
    this.registerImplementation(BotSendMessageSlackNode);
    this.registerImplementation(BotAddReactionSlackNode);

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
      this.registerImplementation(SharePostRedditNode);
      this.registerImplementation(VoteRedditNode);
    }

    if (hasX) {
      this.registerImplementation(SharePostXNode);
      this.registerImplementation(DeletePostXNode);
      this.registerImplementation(FollowUserXNode);
      this.registerImplementation(GetPostXNode);
      this.registerImplementation(GetUserXNode);
      this.registerImplementation(LikePostXNode);
      this.registerImplementation(ListFollowersXNode);
      this.registerImplementation(ListFollowingXNode);
      this.registerImplementation(ListUserMentionsXNode);
      this.registerImplementation(ListUserPostsXNode);
      this.registerImplementation(RepostXNode);
      this.registerImplementation(SearchPostsXNode);
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
    this.registerImplementation(DemToGltfNode);
    this.registerImplementation(GeoTiffDemQueryNode);
    this.registerImplementation(GeoTiffMetadataReaderNode);
    this.registerImplementation(GeoTiffQueryNode);
    this.registerImplementation(GeoTiffTransformNode);
    this.registerImplementation(GltfWireframeNode);

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

    // Geo nodes
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
    this.registerImplementation(Gemini3FlashNode);
    this.registerImplementation(Gemini31ProNode);
    this.registerImplementation(Gemini25FlashImagePreviewNode);
    this.registerImplementation(Gemini31FlashImagePreviewNode);
    this.registerImplementation(Gemini3ProImagePreviewNode);
    this.registerImplementation(Gemini25FlashAudioUnderstandingNode);
    this.registerImplementation(Gemini25ProAudioUnderstandingNode);
    this.registerImplementation(Gemini25FlashImageUnderstandingNode);
    this.registerImplementation(Gemini25ProImageUnderstandingNode);
    this.registerImplementation(Gemini25FlashTtsNode);
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
    this.registerImplementation(VideoOutputNode);
    this.registerImplementation(GltfOutputNode);
    this.registerImplementation(JsonOutputNode);
    this.registerImplementation(GeoJSONOutputNode);
    this.registerImplementation(SecretOutputNode);
    this.registerImplementation(AnyOutputNode);

    // Agent nodes — multi-turn agentic execution via Durable Object
    this.registerImplementation(AgentClaudeSonnet4Node);
    this.registerImplementation(AgentGemini25FlashNode);
    this.registerImplementation(AgentGemini3FlashNode);
    this.registerImplementation(AgentGemini31ProNode);
    this.registerImplementation(AgentGpt41Node);
    this.registerImplementation(AgentQwen330BA3BFp8Node);
  }
}
