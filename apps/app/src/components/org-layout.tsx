import type { OrganizationInfo } from "@dafthunk/types";
import CreditCard from "lucide-react/icons/credit-card";
import Database from "lucide-react/icons/database";
import Folder from "lucide-react/icons/folder";
import Inbox from "lucide-react/icons/inbox";
import KeyRound from "lucide-react/icons/key-round";
import LayoutDashboard from "lucide-react/icons/layout-dashboard";
import Lock from "lucide-react/icons/lock";
import Logs from "lucide-react/icons/logs";
import Mail from "lucide-react/icons/mail";
import Plug from "lucide-react/icons/plug";
import SquareTerminal from "lucide-react/icons/square-terminal";
import Target from "lucide-react/icons/target";
import Users from "lucide-react/icons/users";
import React, { useEffect } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layouts/app-layout";
import { TourProvider } from "@/components/tour";
import { useOrganizations } from "@/services/organizations-service";

interface OrgLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const getDashboardSidebarGroups = (orgHandle: string) => [
  {
    items: [
      {
        title: "Dashboard",
        url: `/org/${orgHandle}/dashboard`,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Workflows",
    items: [
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
    ],
  },
  {
    label: "Triggers",
    items: [
      {
        title: "Emails",
        url: `/org/${orgHandle}/emails`,
        icon: Mail,
      },
      {
        title: "Queues",
        url: `/org/${orgHandle}/queues`,
        icon: Inbox,
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Datasets",
        url: `/org/${orgHandle}/datasets`,
        icon: Folder,
      },
      {
        title: "Databases",
        url: `/org/${orgHandle}/databases`,
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
    ],
  },
  {
    label: "Settings",
    items: [
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
      {
        title: "Billing",
        url: `/org/${orgHandle}/billing`,
        icon: CreditCard,
      },
    ],
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

  const sidebarGroups = getDashboardSidebarGroups(organization?.handle);

  return (
    <AppLayout
      sidebar={{
        title,
        groups: sidebarGroups,
        footerItems: [],
      }}
    >
      <TourProvider>{children}</TourProvider>
    </AppLayout>
  );
};
