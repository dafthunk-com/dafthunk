import {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  DeleteDatabaseResponse,
  GetDatabaseResponse,
  ListDatabasesResponse,
  UpdateDatabaseRequest,
  UpdateDatabaseResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for databases
const API_ENDPOINT_BASE = "/databases";

/**
 * Hook to list all databases for the current organization
 */
export const useDatabases = (): {
  databases: ListDatabasesResponse["databases"];
  databasesError: Error | null;
  isDatabasesLoading: boolean;
  mutateDatabases: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID
  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListDatabasesResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.databases;
        }
      : null
  );

  return {
    databases: data || [],
    databasesError: error || null,
    isDatabasesLoading: isLoading,
    mutateDatabases: mutate,
  };
};

/**
 * Hook to get a specific database by ID
 */
export const useDatabase = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID and database ID
  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetDatabaseResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    database: data,
    databaseError: error || null,
    isDatabaseLoading: isLoading,
    mutateDatabase: mutate,
  };
};

/**
 * Create a new database for the current organization
 */
export const createDatabase = async (
  request: CreateDatabaseRequest,
  orgId: string
): Promise<CreateDatabaseResponse> => {
  const response = await makeOrgRequest<CreateDatabaseResponse>(
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
 * Update a database by ID
 */
export const updateDatabase = async (
  id: string,
  request: UpdateDatabaseRequest,
  orgId: string
): Promise<UpdateDatabaseResponse> => {
  return await makeOrgRequest<UpdateDatabaseResponse>(
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
 * Delete a database by ID
 */
export const deleteDatabase = async (
  id: string,
  orgId: string
): Promise<DeleteDatabaseResponse> => {
  return await makeOrgRequest<DeleteDatabaseResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
