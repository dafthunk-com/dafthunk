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
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListDatasetsResponse>(
            orgHandle,
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
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and dataset ID
  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetDatasetResponse>(
            orgHandle,
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
  orgHandle: string
): Promise<CreateDatasetResponse> => {
  const response = await makeOrgRequest<CreateDatasetResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<DeleteDatasetResponse> => {
  return await makeOrgRequest<DeleteDatasetResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<UploadDatasetFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await makeOrgRequest<UploadDatasetFileResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<{
  success: string[];
  errors: { file: string; error: string }[];
}> => {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        await uploadDatasetFile(datasetId, file, orgHandle);
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
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and dataset ID
  const swrKey =
    orgHandle && datasetId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/${datasetId}/files`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ListDatasetFilesResponse>(
    swrKey,
    swrKey && orgHandle && datasetId
      ? async () => {
          return await makeOrgRequest<ListDatasetFilesResponse>(
            orgHandle,
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
  orgHandle: string
): Promise<DeleteDatasetFileResponse> => {
  const response = await makeOrgRequest<DeleteDatasetFileResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<void> => {
  // Create the download URL
  const downloadUrl = `${getApiBaseUrl()}/${orgHandle}${API_ENDPOINT_BASE}/${datasetId}/files/${filename}`;

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.target = "_blank";

  // Append to document, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
