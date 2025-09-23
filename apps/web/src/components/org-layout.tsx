import type { OrganizationInfo } from "@dafthunk/types";
import React, { useEffect } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layouts/app-layout";
import { getDashboardSidebarItems } from "@/routes";
import { useOrganizations } from "@/services/organizations-service";

interface OrgLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const OrgLayout: React.FC<OrgLayoutProps> = ({ children, title }) => {
  const params = useParams<{ handle: string }>();
  const { organization, setSelectedOrganization } = useAuth();
  const { organizations: orgList } = useOrganizations();

  useEffect(() => {
    if (params.handle && organization?.handle && orgList.length > 0) {
      const currentHandle = organization.handle;
      if (params.handle !== currentHandle) {
        const targetOrg = orgList.find((org) => org.handle === params.handle);
        if (targetOrg) {
          const newOrg: OrganizationInfo = {
            id: targetOrg.id,
            name: targetOrg.name,
            handle: targetOrg.handle,
            role: "owner",
          };
          setSelectedOrganization(newOrg);
        }
      }
    }
  }, [params.handle, organization?.handle, orgList, setSelectedOrganization]);

  if (!organization?.handle) {
    // Fallback to a loading state or redirect
    return <div>Loading...</div>;
  }

  const sidebarItems = getDashboardSidebarItems(organization?.handle);

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
