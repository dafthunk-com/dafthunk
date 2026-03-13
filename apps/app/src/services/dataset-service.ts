import {
  CreateDatasetRequest,
  CreateDatasetResponse,
  DeleteDatasetFileResponse,
  DeleteDatasetResponse,
  GetDatasetResponse,
  ListDatasetFilesResponse,
  ListDatasetsResponse,
  UploadDatasetFileResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";

import { makeOrgRequest } from "./utils";

// Base endpoint for datasets
const API_ENDPOINT_BASE = "/datasets";

/**
 * Hook to list all datasets for the current organization
 */
export const useDatasets = (): {
  datasets: ListDatasetsResponse["datasets"];
  datasetsError: Error | null;
  isDatasetsLoading: boolean;
  mutateDatasets: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID
  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListDatasetsResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.datasets;
        }
      : null
  );

  return {
    datasets: data || [],
    datasetsError: error || null,
    isDatasetsLoading: isLoading,
    mutateDatasets: mutate,
  };
};

/**
 * Hook to get a specific dataset by ID
 */
export const useDataset = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID and dataset ID
  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetDatasetResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    dataset: data,
    datasetError: error || null,
    isDatasetLoading: isLoading,
    mutateDataset: mutate,
  };
};

/**
 * Create a new dataset for the current organization
 */
export const createDataset = async (
  request: CreateDatasetRequest,
  orgId: string
): Promise<CreateDatasetResponse> => {
  const response = await makeOrgRequest<CreateDatasetResponse>(
    orgId,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Delete a dataset by ID
 */
export const deleteDataset = async (
  id: string,
  orgId: string
): Promise<DeleteDatasetResponse> => {
  return await makeOrgRequest<DeleteDatasetResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

/**
 * Upload a file to a dataset
 */
export const uploadDatasetFile = async (
  datasetId: string,
  file: File,
  orgId: string
): Promise<UploadDatasetFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await makeOrgRequest<UploadDatasetFileResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${datasetId}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  return response;
};

/**
 * Upload multiple files to a dataset
 */
export const uploadDatasetFiles = async (
  datasetId: string,
  files: File[],
  orgId: string
): Promise<{
  success: string[];
  errors: { file: string; error: string }[];
}> => {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        await uploadDatasetFile(datasetId, file, orgId);
        return { success: true, filename: file.name } as const;
      } catch (error) {
        return {
          success: false,
          filename: file.name,
          error:
            error instanceof Error
              ? error.message || "Unknown error"
              : "Unknown error",
        } as const;
      }
    })
  );

  const success: string[] = [];
  const errors: { file: string; error: string }[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        success.push(result.value.filename);
      } else {
        errors.push({
          file: result.value.filename,
          error: result.value.error,
        });
      }
    } else {
      errors.push({
        file: "Unknown file",
        error:
          result.reason instanceof Error
            ? result.reason.message || "Unknown error"
            : "Unknown error",
      });
    }
  });

  return { success, errors };
};

/**
 * Hook to list files in a dataset
 */
export const useDatasetFiles = (datasetId: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID and dataset ID
  const swrKey =
    orgId && datasetId
      ? `/${orgId}${API_ENDPOINT_BASE}/${datasetId}/files`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ListDatasetFilesResponse>(
    swrKey,
    swrKey && orgId && datasetId
      ? async () => {
          return await makeOrgRequest<ListDatasetFilesResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${datasetId}/files`
          );
        }
      : null
  );

  return {
    files: data?.files || [],
    filesError: error || null,
    isFilesLoading: isLoading,
    mutateFiles: mutate,
  };
};

/**
 * Delete a file from a dataset
 */
export const deleteDatasetFile = async (
  datasetId: string,
  filename: string,
  orgId: string
): Promise<DeleteDatasetFileResponse> => {
  const response = await makeOrgRequest<DeleteDatasetFileResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${datasetId}/files/${filename}`,
    {
      method: "DELETE",
    }
  );

  return response;
};

/**
 * Download a file from a dataset
 */
export const downloadDatasetFile = async (
  datasetId: string,
  filename: string,
  orgId: string
): Promise<void> => {
  // Create the download URL
  const downloadUrl = `${getApiBaseUrl()}/${orgId}${API_ENDPOINT_BASE}/${datasetId}/files/${filename}`;

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.target = "_blank";

  // Append to document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
