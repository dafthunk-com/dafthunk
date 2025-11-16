import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { getProvider } from "../providers";

interface OAuthCallbackOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "OAuth authentication failed",
  invalid_state: "Invalid OAuth state",
  expired_state: "OAuth session expired",
  not_authenticated: "Please log in first",
  organization_mismatch: "Organization mismatch",
};

/**
 * Hook to handle OAuth callback parameters
 * Displays success/error toasts and clears URL parameters
 */
export function useOAuthCallback(options: OAuthCallbackOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      // Parse provider from success parameter (e.g., "google_mail_connected")
      const providerMatch = success.match(/^(.+)_connected$/);
      if (providerMatch) {
        const providerId = providerMatch[1].replace(/_/g, "-");
        const provider = getProvider(providerId as any);
        const message =
          provider?.successMessage || "Integration connected successfully";
        toast.success(message);
      } else {
        toast.success("Integration connected successfully");
      }

      options.onSuccess?.();
      setSearchParams({});
    } else if (error) {
      const message = ERROR_MESSAGES[error] || "Failed to connect integration";
      toast.error(message);
      options.onError?.();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, options]);
}
