import {
  CreateEmailRequest,
  CreateEmailResponse,
  DeleteEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
  UpdateEmailRequest,
  UpdateEmailResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for emails
const API_ENDPOINT_BASE = "/emails";

/**
 * Hook to list all emails for the current organization
 */
export const useEmails = (): {
  emails: ListEmailsResponse["emails"];
  emailsError: Error | null;
  isEmailsLoading: boolean;
  mutateEmails: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListEmailsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.emails;
        }
      : null
  );

  return {
    emails: data || [],
    emailsError: error || null,
    isEmailsLoading: isLoading,
    mutateEmails: mutate,
  };
};

/**
 * Hook to get a specific email by ID
 */
export const useEmail = (id: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and email ID
  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetEmailResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    email: data,
    emailError: error || null,
    isEmailLoading: isLoading,
    mutateEmail: mutate,
  };
};

/**
 * Create a new email for the current organization
 */
export const createEmail = async (
  request: CreateEmailRequest,
  orgHandle: string
): Promise<CreateEmailResponse> => {
  const response = await makeOrgRequest<CreateEmailResponse>(
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
 * Update an email by ID
 */
export const updateEmail = async (
  id: string,
  request: UpdateEmailRequest,
  orgHandle: string
): Promise<UpdateEmailResponse> => {
  return await makeOrgRequest<UpdateEmailResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

/**
 * Delete an email by ID
 */
export const deleteEmail = async (
  id: string,
  orgHandle: string
): Promise<DeleteEmailResponse> => {
  return await makeOrgRequest<DeleteEmailResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
