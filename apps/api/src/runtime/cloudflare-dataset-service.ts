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
 * Builds AutoRAG search parameters from abstract options.
 * Shared between search() and aiSearch().
 */
function buildSearchParams(
  query: string,
  datasetId: string,
  options?: DatasetSearchOptions
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    query: query.trim(),
    filters: { type: "eq", key: "folder", value: `${datasetId}/` },
  };

  if (options?.rewriteQuery !== undefined) {
    params.rewrite_query = options.rewriteQuery;
  }

  if (options?.maxResults !== undefined) {
    params.max_num_results = Math.min(Math.max(options.maxResults, 1), 50);
  }

  if (options?.scoreThreshold !== undefined) {
    params.ranking_options = {
      score_threshold: Math.min(Math.max(options.scoreThreshold, 0), 1),
    };
  }

  return params;
}

/**
 * Dataset capability object backed by R2 + AutoRAG.
 * Pre-bound to a verified dataset ID after ownership check.
 */
class CloudflareDataset implements Dataset {
  constructor(
    private datasetId: string,
    private bucket: R2Bucket,
    private ai: Ai,
    private autoragName: string
  ) {}

  private get prefix(): string {
    return `${this.datasetId}/`;
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
    const params = buildSearchParams(query, this.datasetId, options);
    const autorag = this.ai.autorag(this.autoragName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await autorag.search(params as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    return {
      results: r?.data ?? [],
      searchQuery: r?.search_query ?? query,
      hasMore: r?.has_more ?? false,
    };
  }

  async aiSearch(
    query: string,
    options?: DatasetAiSearchOptions
  ): Promise<DatasetAiSearchResult> {
    const params = buildSearchParams(query, this.datasetId, options);
    params.stream = false;
    if (options?.model) {
      params.model = options.model;
    }

    const autorag = this.ai.autorag(this.autoragName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await autorag.aiSearch(params as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = result as any;
    return {
      response: typeof r === "string" ? r : (r?.response ?? ""),
      results: r?.data ?? [],
      searchQuery: r?.search_query ?? query,
    };
  }
}

/**
 * Cloudflare-backed DatasetService.
 * Verifies dataset ownership via D1, then returns a Dataset
 * capability backed by R2 and AutoRAG.
 */
export class CloudflareDatasetService implements DatasetService {
  constructor(
    private env: Pick<Bindings, "DB" | "DATASETS" | "AI" | "DATASETS_AUTORAG">
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
      this.env.AI,
      this.env.DATASETS_AUTORAG
    );
  }
}
