import React from "react";

import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layouts/app-layout";
import { getDashboardSidebarItems } from "@/routes";

interface OrgLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const OrgLayout: React.FC<OrgLayoutProps> = ({ children, title }) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  if (!orgHandle) {
    // Fallback to a loading state or redirect
    return <div>Loading...</div>;
  }

  const sidebarItems = getDashboardSidebarItems(orgHandle);

  return (
    <AppLayout
      sidebar={{
        title,
        items: sidebarItems,
        footerItems: [],
      }}
    >
      {children}
    </AppLayout>
  );
};
