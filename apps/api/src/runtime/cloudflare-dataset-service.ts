import type {
  Dataset,
  DatasetAiSearchOptions,
  DatasetAiSearchResult,
  DatasetFileContent,
  DatasetFileInfo,
  DatasetSearchOptions,
  DatasetSearchResult,
  DatasetService,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { createDatabase, getDataset } from "../db";

/**
 * Builds AI Search (v3) options from abstract options.
 * Shared between search() and aiSearch().
 *
 * Multi-tenancy is enforced with a Vectorize-style metadata filter on the
 * `folder` attribute (implicit equality), scoping every query to the
 * dataset's prefix.
 */
function buildAiSearchOptions(
  datasetId: string,
  options?: DatasetSearchOptions
): AiSearchOptions {
  const retrieval: NonNullable<AiSearchOptions["retrieval"]> = {
    // Per-tenant isolation via a "starts with" folder filter, matching every
    // chunk under `${datasetId}/` (including subfolders). The managed AI Search
    // binding expects this range form, not exact equality — `/` (0x2F) sorts
    // just below `0` (0x30), so `${datasetId}/` <= folder < `${datasetId}0`.
    // See https://developers.cloudflare.com/ai-search/how-to/per-tenant-search/
    filters: { folder: { $gte: `${datasetId}/`, $lt: `${datasetId}0` } },
    // AI Search v3's keyword leg defaults to "and", requiring every query term
    // to appear in a chunk, which collapses recall (only exact wording hits).
    // Default to "or" so any matching term contributes; callers can tighten it.
    keyword_match_mode: options?.keywordMatchMode ?? "or",
  };

  if (options?.retrievalType !== undefined) {
    retrieval.retrieval_type = options.retrievalType;
  }

  if (options?.maxResults !== undefined) {
    retrieval.max_num_results = Math.min(Math.max(options.maxResults, 1), 50);
  }

  if (options?.scoreThreshold !== undefined) {
    retrieval.match_threshold = Math.min(
      Math.max(options.scoreThreshold, 0),
      1
    );
  }

  const aiSearchOptions: AiSearchOptions = { retrieval };

  // Reranking (added in AI Search v3) runs a second model after retrieval and
  // applies its own `reranking.match_threshold` (default 0.4) that neither
  // `match_threshold` nor `keyword_match_mode` relaxes. When enabled on the
  // instance it silently drops every chunk below that score, so only near-exact
  // wording survives. Disable it by default to restore broad recall; callers
  // can opt back in (then tune `reranking.match_threshold` separately).
  aiSearchOptions.reranking = {
    enabled: options?.reranking ?? false,
  };

  if (options?.rewriteQuery !== undefined) {
    aiSearchOptions.query_rewrite = { enabled: Boolean(options.rewriteQuery) };
  }

  return aiSearchOptions;
}

/**
 * Maps AI Search response chunks to the abstract result shape, deriving a
 * friendly `filename` from item metadata (falling back to the storage key).
 */
function mapChunks(
  chunks: AiSearchSearchResponse["chunks"]
): DatasetSearchResult["results"] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    score: chunk.score,
    text: chunk.text,
    filename:
      (chunk.item.metadata?.filename as string | undefined) ?? chunk.item.key,
    key: chunk.item.key,
    metadata: chunk.item.metadata,
  }));
}

/**
 * Dataset capability object backed by R2 + AI Search.
 * Pre-bound to a verified dataset ID after ownership check.
 */
class CloudflareDataset implements Dataset {
  constructor(
    private datasetId: string,
    private bucket: R2Bucket,
    private namespace: AiSearchNamespace,
    private instanceName: string
  ) {}

  private get prefix(): string {
    return `${this.datasetId}/`;
  }

  private get instance(): AiSearchInstance {
    return this.namespace.get(this.instanceName);
  }

  async listFiles(): Promise<DatasetFileInfo[]> {
    const listed = await this.bucket.list({ prefix: this.prefix });
    return listed.objects.map((obj) => ({
      key: obj.key,
      filename: obj.key.replace(this.prefix, ""),
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));
  }

  async getFile(filename: string): Promise<DatasetFileContent | undefined> {
    const object = await this.bucket.get(`${this.prefix}${filename}`);
    if (!object) return undefined;

    return {
      data: await object.arrayBuffer(),
      mimeType: object.httpMetadata?.contentType || "application/octet-stream",
      size: object.size,
    };
  }

  async uploadFile(
    filename: string,
    content: ArrayBuffer,
    contentType?: string
  ): Promise<void> {
    await this.bucket.put(`${this.prefix}${filename}`, content, {
      httpMetadata: {
        contentType: contentType || "application/octet-stream",
      },
    });
  }

  async deleteFile(filename: string): Promise<void> {
    await this.bucket.delete(`${this.prefix}${filename}`);
  }

  async search(
    query: string,
    options?: DatasetSearchOptions
  ): Promise<DatasetSearchResult> {
    const aiSearchOptions = buildAiSearchOptions(this.datasetId, options);
    const result = await this.instance.search({
      query: query.trim(),
      ai_search_options: aiSearchOptions,
    });

    const maxResults = aiSearchOptions.retrieval?.max_num_results ?? 10;
    return {
      results: mapChunks(result.chunks),
      searchQuery: result.search_query ?? query,
      hasMore: result.chunks.length >= maxResults,
    };
  }

  async aiSearch(
    query: string,
    options?: DatasetAiSearchOptions
  ): Promise<DatasetAiSearchResult> {
    const aiSearchOptions = buildAiSearchOptions(this.datasetId, options);
    const result = await this.instance.chatCompletions({
      messages: [{ role: "user", content: query.trim() }],
      ai_search_options: aiSearchOptions,
      ...(options?.model ? { model: options.model } : {}),
    });

    return {
      response: result.choices[0]?.message?.content ?? "",
      results: mapChunks(result.chunks),
      searchQuery: query,
    };
  }
}

/**
 * Cloudflare-backed DatasetService.
 * Verifies dataset ownership via D1, then returns a Dataset
 * capability backed by R2 and AI Search.
 */
export class CloudflareDatasetService implements DatasetService {
  constructor(
    private env: Pick<
      Bindings,
      "DB" | "DATASETS" | "AI_SEARCH" | "DATASETS_AUTORAG"
    >
  ) {}

  async resolve(
    datasetId: string,
    organizationId: string
  ): Promise<Dataset | undefined> {
    const db = createDatabase(this.env.DB);
    const dataset = await getDataset(db, datasetId, organizationId);

    if (!dataset) return undefined;

    return new CloudflareDataset(
      datasetId,
      this.env.DATASETS,
      this.env.AI_SEARCH,
      this.env.DATASETS_AUTORAG
    );
  }
}
