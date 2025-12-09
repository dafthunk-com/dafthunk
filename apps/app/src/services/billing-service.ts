import type {
  CreateBillingPortalResponse,
  CreateCheckoutSessionResponse,
  GetBillingResponse,
  UpdateOverageLimitResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/billing";

interface UseBilling {
  billing: GetBillingResponse["billing"] | null;
  billingError: Error | null;
  isBillingLoading: boolean;
  mutateBilling: () => Promise<any>;
}

/**
 * Hook to get billing information for the current organization
 */
export const useBilling = (): UseBilling => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<GetBillingResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.billing;
        }
      : null
  );

  return {
    billing: data || null,
    billingError: error || null,
    isBillingLoading: isLoading,
    mutateBilling: mutate,
  };
};

/**
 * Create a checkout session for upgrading to Pro plan
 */
export const createCheckoutSession = async (
  orgHandle: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> => {
  const response = await makeOrgRequest<CreateCheckoutSessionResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "/checkout",
    {
      method: "POST",
      body: JSON.stringify({ successUrl, cancelUrl }),
    }
  );

  return response.checkoutUrl;
};

/**
 * Create a billing portal session for managing subscription
 */
export const createBillingPortal = async (
  orgHandle: string,
  returnUrl: string
): Promise<string> => {
  const response = await makeOrgRequest<CreateBillingPortalResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "/portal",
    {
      method: "POST",
      body: JSON.stringify({ returnUrl }),
    }
  );

  return response.portalUrl;
};

/**
 * Update the overage limit for the organization
 * @param overageLimit - The new limit, or null for unlimited
 */
export const updateOverageLimit = async (
  orgHandle: string,
  overageLimit: number | null
): Promise<number | null> => {
  const response = await makeOrgRequest<UpdateOverageLimitResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "/overage-limit",
    {
      method: "PATCH",
      body: JSON.stringify({ overageLimit }),
    }
  );

  return response.overageLimit;
};
