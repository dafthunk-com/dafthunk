/**
 * Abstract dataset access for workflow nodes.
 *
 * Hides ownership verification, R2 file storage, and AI Search
 * behind a single resolve → Dataset capability object. Nodes never
 * touch D1, R2 buckets, or AI bindings directly.
 */

export interface DatasetFileInfo {
  key: string;
  filename: string;
  size: number;
  uploaded: string;
}

export interface DatasetFileContent {
  data: ArrayBuffer;
  mimeType: string;
  size: number;
}

export interface DatasetSearchOptions {
  rewriteQuery?: boolean;
  maxResults?: number;
  scoreThreshold?: number;
  /**
   * How keyword terms are combined in hybrid/keyword retrieval.
   * "or" (any term matches) maximizes recall; "and" (every term must match)
   * is the strict AI Search v3 default that over-filters. Defaults to "or".
   */
  keywordMatchMode?: "and" | "or";
  /**
   * Which retrieval backend to use. Left unset, AI Search uses the instance's
   * configured index method.
   */
  retrievalType?: "vector" | "keyword" | "hybrid";
  /**
   * Enable reranking. AI Search v3 reranking applies its own match threshold
   * (default 0.4) after retrieval, which over-filters and only returns
   * near-exact matches. Defaults to false to preserve recall.
   */
  reranking?: boolean;
}

export interface DatasetSearchResult {
  results: unknown[];
  searchQuery: string;
  hasMore: boolean;
}

export interface DatasetAiSearchOptions extends DatasetSearchOptions {
  model?: string;
}

export interface DatasetAiSearchResult {
  response: string;
  results: unknown[];
  searchQuery: string;
}

export interface Dataset {
  listFiles(): Promise<DatasetFileInfo[]>;
  getFile(filename: string): Promise<DatasetFileContent | undefined>;
  uploadFile(
    filename: string,
    content: ArrayBuffer,
    contentType?: string
  ): Promise<void>;
  deleteFile(filename: string): Promise<void>;
  search(
    query: string,
    options?: DatasetSearchOptions
  ): Promise<DatasetSearchResult>;
  aiSearch(
    query: string,
    options?: DatasetAiSearchOptions
  ): Promise<DatasetAiSearchResult>;
}

export interface DatasetService {
  /**
   * Verifies that the dataset belongs to the organization and returns
   * a Dataset capability scoped to that dataset. Returns undefined if
   * the dataset is not found or access is denied.
   */
  resolve(
    datasetId: string,
    organizationId: string
  ): Promise<Dataset | undefined>;
}
