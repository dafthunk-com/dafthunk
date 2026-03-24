import type {
  CreateSchemaRequest,
  CreateSchemaResponse,
  DeleteSchemaResponse,
  GetSchemaResponse,
  ListSchemasResponse,
  UpdateSchemaRequest,
  UpdateSchemaResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/schemas";

/**
 * Hook to list all schemas for the current organization
 */
export const useSchemas = (): {
  schemas: ListSchemasResponse["schemas"];
  schemasError: Error | null;
  isSchemasLoading: boolean;
  mutateSchemas: () => Promise<unknown>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListSchemasResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.schemas;
        }
      : null
  );

  return {
    schemas: data || [],
    schemasError: error || null,
    isSchemasLoading: isLoading,
    mutateSchemas: mutate,
  };
};

/**
 * Hook to get a specific schema by ID
 */
export const useSchema = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetSchemaResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    schema: data?.schema,
    schemaError: error || null,
    isSchemaLoading: isLoading,
    mutateSchema: mutate,
  };
};

/**
 * Create a new schema
 */
export const createSchema = async (
  request: CreateSchemaRequest,
  orgId: string
): Promise<CreateSchemaResponse> => {
  return await makeOrgRequest<CreateSchemaResponse>(
    orgId,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );
};

/**
 * Update a schema by ID
 */
export const updateSchema = async (
  id: string,
  request: UpdateSchemaRequest,
  orgId: string
): Promise<UpdateSchemaResponse> => {
  return await makeOrgRequest<UpdateSchemaResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

/**
 * Delete a schema by ID
 */
export const deleteSchema = async (
  id: string,
  orgId: string
): Promise<DeleteSchemaResponse> => {
  return await makeOrgRequest<DeleteSchemaResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
