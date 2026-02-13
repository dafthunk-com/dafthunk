/**
 * Mock Dataset Service
 *
 * Test implementation of DatasetService that returns empty datasets.
 * Provides a no-op Dataset for testing workflows that don't need real R2/AutoRAG.
 */

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

class MockDataset implements Dataset {
  async listFiles(): Promise<DatasetFileInfo[]> {
    return [];
  }

  async getFile(_filename: string): Promise<DatasetFileContent | undefined> {
    return undefined;
  }

  async uploadFile(
    _filename: string,
    _content: ArrayBuffer,
    _contentType?: string
  ): Promise<void> {
    // No-op
  }

  async deleteFile(_filename: string): Promise<void> {
    // No-op
  }

  async search(
    query: string,
    _options?: DatasetSearchOptions
  ): Promise<DatasetSearchResult> {
    return { results: [], searchQuery: query, hasMore: false };
  }

  async aiSearch(
    query: string,
    _options?: DatasetAiSearchOptions
  ): Promise<DatasetAiSearchResult> {
    return { response: "", results: [], searchQuery: query };
  }
}

export class MockDatasetService implements DatasetService {
  async resolve(
    _datasetId: string,
    _organizationId: string
  ): Promise<Dataset | undefined> {
    return new MockDataset();
  }
}
