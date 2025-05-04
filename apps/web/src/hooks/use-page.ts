import { useEffect } from "react";
import {
  useBreadcrumbsSetter,
  useBreadcrumbs,
  usePage as usePageContext,
  BreadcrumbItem,
} from "@/components/page-context";

/**
 * Hook that provides access to the full page context
 */
export function usePage() {
  return usePageContext();
}

/**
 * Hook that manages breadcrumb state for a page component
 *
 * @param items - Array of breadcrumb items to display
 * @param dependencies - Optional array of dependencies that should trigger breadcrumb update
 */
export function usePageBreadcrumbs(
  items: BreadcrumbItem[],
  dependencies: React.DependencyList = []
) {
  const setBreadcrumbs = useBreadcrumbsSetter();

  useEffect(() => {
    // Set the breadcrumbs when the component mounts or dependencies change
    setBreadcrumbs(items);

    // Clean up breadcrumbs when component unmounts
    return () => {
      setBreadcrumbs([]);
    };
  }, [...dependencies]);

  // Return the setter for cases where breadcrumbs need to be updated dynamically
  return { setBreadcrumbs };
}

/**
 * Hook to access current breadcrumbs without managing their lifecycle
 * Useful when you need to read or modify breadcrumbs from components that don't own them
 */
export function usePageBreadcrumbsState() {
  return useBreadcrumbs();
}

// Legacy support - To be deprecated
export function usePageBreadcrumb(
  items: BreadcrumbItem[],
  dependencies: React.DependencyList = []
) {
  const { setBreadcrumbs } = usePageBreadcrumbs(items, dependencies);
  return { setBreadcrumb: setBreadcrumbs };
}
