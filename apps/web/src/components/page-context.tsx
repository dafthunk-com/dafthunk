import { createContext, useContext, ReactNode, useState } from "react";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type PageContextType = {
  // Breadcrumb state
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;

  // Add future page-level state here
  // pageTitle?: string;
  // setPageTitle?: (title: string) => void;
  // etc.
};

const PageContext = createContext<PageContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
});

export function PageProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Create value object with all page context
  const pageContext = {
    // Breadcrumb state
    breadcrumbs,
    setBreadcrumbs,

    // Future page-level state would be added here
  };

  return (
    <PageContext.Provider value={pageContext}>{children}</PageContext.Provider>
  );
}

// Specialized hooks for specific page features
export function useBreadcrumbs() {
  const { breadcrumbs, setBreadcrumbs } = useContext(PageContext);
  return { breadcrumbs, setBreadcrumbs };
}

export function useBreadcrumbsSetter() {
  const { setBreadcrumbs } = useContext(PageContext);
  return setBreadcrumbs;
}
