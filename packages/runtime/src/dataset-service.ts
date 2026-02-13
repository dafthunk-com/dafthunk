/**
 * Abstract dataset access for workflow nodes.
 *
 * Hides ownership verification, R2 file storage, and AutoRAG search
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
