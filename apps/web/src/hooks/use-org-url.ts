import { useAuth } from "@/components/auth-context";

/**
 * Hook to generate organization URLs with the current organization handle
 */
export const useOrgUrl = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const getOrgUrl = (path: string): string => {
    if (!orgHandle) {
      console.warn("No organization handle available for URL generation");
      return `/org/${path}`;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    // If path already includes org handle, return as is
    if (cleanPath.startsWith(`org/${orgHandle}/`)) {
      return `/${cleanPath}`;
    }

    // If path starts with org/, replace with org/:handle
    if (cleanPath.startsWith("org/")) {
      return `/${cleanPath.replace("org/", `org/${orgHandle}/`)}`;
    }

    // Otherwise, prepend org/:handle
    return `/org/${orgHandle}/${cleanPath}`;
  };

  return {
    orgHandle,
    getOrgUrl,
  };
};
