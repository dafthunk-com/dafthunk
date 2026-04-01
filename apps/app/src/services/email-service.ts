import type {
  CreateEmailRequest,
  CreateEmailResponse,
  DeleteEmailResponse,
  DeleteSenderEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
  SetSenderEmailResponse,
  UpdateEmailRequest,
  UpdateEmailResponse,
  VerifySenderEmailResponse,
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
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID
  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListEmailsResponse>(
            orgId,
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
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID and email ID
  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetEmailResponse>(
            orgId,
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
  orgId: string
): Promise<CreateEmailResponse> => {
  const response = await makeOrgRequest<CreateEmailResponse>(
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
 * Update an email by ID
 */
export const updateEmail = async (
  id: string,
  request: UpdateEmailRequest,
  orgId: string
): Promise<UpdateEmailResponse> => {
  return await makeOrgRequest<UpdateEmailResponse>(
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
 * Delete an email by ID
 */
export const deleteEmail = async (
  id: string,
  orgId: string
): Promise<DeleteEmailResponse> => {
  return await makeOrgRequest<DeleteEmailResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

/**
 * Set the sender email for an email and trigger SES verification
 */
export const setSenderEmail = async (
  emailId: string,
  senderEmailAddress: string,
  orgId: string
): Promise<SetSenderEmailResponse> => {
  return makeOrgRequest<SetSenderEmailResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${emailId}/sender-email`,
    {
      method: "PUT",
      body: JSON.stringify({ email: senderEmailAddress }),
    }
  );
};

/**
 * Check the SES verification status for an email's sender
 */
export const verifySenderEmail = async (
  emailId: string,
  orgId: string
): Promise<VerifySenderEmailResponse> => {
  return makeOrgRequest<VerifySenderEmailResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${emailId}/sender-email/verify`,
    {
      method: "POST",
    }
  );
};

/**
 * Remove the sender email configuration for an email
 */
export const deleteSenderEmail = async (
  emailId: string,
  orgId: string
): Promise<boolean> => {
  const response = await makeOrgRequest<DeleteSenderEmailResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${emailId}/sender-email`,
    {
      method: "DELETE",
    }
  );
  return response.success;
};
