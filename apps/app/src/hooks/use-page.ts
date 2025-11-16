import { useEffect } from "react";

import {
  BreadcrumbItem,
  useBreadcrumbsSetter,
} from "@/components/page-context";

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
