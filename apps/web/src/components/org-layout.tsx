import type { OrganizationInfo } from "@dafthunk/types";
import Database from "lucide-react/icons/database";
import KeyRound from "lucide-react/icons/key-round";
import LayoutDashboard from "lucide-react/icons/layout-dashboard";
import Lock from "lucide-react/icons/lock";
import Logs from "lucide-react/icons/logs";
import Plug from "lucide-react/icons/plug";
import SquareTerminal from "lucide-react/icons/square-terminal";
import Target from "lucide-react/icons/target";
import Users from "lucide-react/icons/users";
import React, { useEffect } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layouts/app-layout";
import { useOrganizations } from "@/services/organizations-service";

interface OrgLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const getDashboardSidebarItems = (orgHandle: string) => [
  {
    title: "Dashboard",
    url: `/org/${orgHandle}/dashboard`,
    icon: LayoutDashboard,
  },
  {
    title: "Workflows",
    url: `/org/${orgHandle}/workflows`,
    icon: SquareTerminal,
  },
  {
    title: "Deployments",
    url: `/org/${orgHandle}/deployments`,
    icon: Target,
  },
  {
    title: "Executions",
    url: `/org/${orgHandle}/executions`,
    icon: Logs,
  },
  {
    title: "Datasets",
    url: `/org/${orgHandle}/datasets`,
    icon: Database,
  },
  {
    title: "Integrations",
    url: `/org/${orgHandle}/integrations`,
    icon: Plug,
  },
  {
    title: "Secrets",
    url: `/org/${orgHandle}/secrets`,
    icon: Lock,
  },
  {
    title: "API Keys",
    url: `/org/${orgHandle}/api-keys`,
    icon: KeyRound,
  },
  {
    title: "Members",
    url: `/org/${orgHandle}/members`,
    icon: Users,
  },
];

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
