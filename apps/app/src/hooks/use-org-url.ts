import { useAuth } from "@/components/auth-context";

/**
 * Hook to generate organization URLs with the current organization ID
 */
export const useOrgUrl = () => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const getOrgUrl = (path: string): string => {
    if (!orgId) {
      console.warn("No organization ID available for URL generation");
      return `/org/${path}`;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    // If path already includes org ID, return as is
    if (cleanPath.startsWith(`org/${orgId}/`)) {
      return `/${cleanPath}`;
    }

    // If path starts with org/, replace with org/:organizationId
    if (cleanPath.startsWith("org/")) {
      return `/${cleanPath.replace("org/", `org/${orgId}/`)}`;
    }

    // Otherwise, prepend org/:organizationId
    return `/org/${orgId}/${cleanPath}`;
  };

  return {
    orgId,
    getOrgUrl,
  };
};
