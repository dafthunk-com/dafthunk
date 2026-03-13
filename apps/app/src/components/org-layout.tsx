import type { OrganizationInfo } from "@dafthunk/types";
import Bot from "lucide-react/icons/bot";
import CreditCard from "lucide-react/icons/credit-card";
import Database from "lucide-react/icons/database";
import FlaskConical from "lucide-react/icons/flask-conical";
import Folder from "lucide-react/icons/folder";
import Globe from "lucide-react/icons/globe";
import Inbox from "lucide-react/icons/inbox";
import KeyRound from "lucide-react/icons/key-round";
import LayoutDashboard from "lucide-react/icons/layout-dashboard";
import Lock from "lucide-react/icons/lock";
import Logs from "lucide-react/icons/logs";
import Mail from "lucide-react/icons/mail";
import MessageSquareText from "lucide-react/icons/message-square-text";
import Plug from "lucide-react/icons/plug";
import SquareTerminal from "lucide-react/icons/square-terminal";

import Users from "lucide-react/icons/users";
import Wand from "lucide-react/icons/wand";
import React, { useEffect } from "react";
import { useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { AppLayout } from "@/components/layouts/app-layout";
import { TourProvider } from "@/components/tour";
import { useOrganizations } from "@/services/organizations-service";
import { useProfile } from "@/services/profile-service";

interface OrgLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const getDashboardSidebarGroups = (
  orgId: string,
  developerMode: boolean = false
) => {
  const groups = [
    {
      items: [
        {
          title: "Dashboard",
          url: `/org/${orgId}/dashboard`,
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Workflows",
      items: [
        {
          title: "Workflows",
          url: `/org/${orgId}/workflows`,
          icon: SquareTerminal,
        },

        {
          title: "Executions",
          url: `/org/${orgId}/executions`,
          icon: Logs,
        },
        {
          title: "Templates",
          url: `/org/${orgId}/templates`,
          icon: Wand,
        },
        {
          title: "Playground",
          url: `/org/${orgId}/playground`,
          icon: FlaskConical,
        },
      ],
    },
    {
      label: "Triggers",
      items: [
        {
          title: "Endpoints",
          url: `/org/${orgId}/endpoints`,
          icon: Globe,
        },
        {
          title: "Emails",
          url: `/org/${orgId}/emails`,
          icon: Mail,
        },
        {
          title: "Queues",
          url: `/org/${orgId}/queues`,
          icon: Inbox,
        },
        {
          title: "Bots",
          url: `/org/${orgId}/bots`,
          icon: Bot,
        },
      ],
    },
    {
      label: "Resources",
      items: [
        {
          title: "Datasets",
          url: `/org/${orgId}/datasets`,
          icon: Folder,
        },
        {
          title: "Databases",
          url: `/org/${orgId}/databases`,
          icon: Database,
        },
        {
          title: "Integrations",
          url: `/org/${orgId}/integrations`,
          icon: Plug,
        },
        {
          title: "Secrets",
          url: `/org/${orgId}/secrets`,
          icon: Lock,
        },
      ],
    },
  ];

  // Only add Analytics section if developer mode is enabled
  if (developerMode) {
    groups.push({
      label: "Analytics",
      items: [
        {
          title: "Feedback",
          url: `/org/${orgId}/feedback`,
          icon: MessageSquareText,
        },
      ],
    });
  }

  // Add Settings section
  groups.push({
    label: "Settings",
    items: [
      {
        title: "API Keys",
        url: `/org/${orgId}/api-keys`,
        icon: KeyRound,
      },
      {
        title: "Members",
        url: `/org/${orgId}/members`,
        icon: Users,
      },
      {
        title: "Billing",
        url: `/org/${orgId}/billing`,
        icon: CreditCard,
      },
    ],
  });

  return groups;
};

export const OrgLayout: React.FC<OrgLayoutProps> = ({ children, title }) => {
  const params = useParams<{ organizationId: string }>();
  const { organization, setSelectedOrganization } = useAuth();
  const { organizations: orgList } = useOrganizations();
  const { profile } = useProfile();

  useEffect(() => {
    if (params.organizationId && organization?.id && orgList.length > 0) {
      if (params.organizationId !== organization.id) {
        const targetOrg = orgList.find(
          (org) => org.id === params.organizationId
        );
        if (targetOrg) {
          const newOrg: OrganizationInfo = {
            id: targetOrg.id,
            name: targetOrg.name,
            role: "owner",
          };
          setSelectedOrganization(newOrg);
        }
      }
    }
  }, [
    params.organizationId,
    organization?.id,
    orgList,
    setSelectedOrganization,
  ]);

  if (!organization?.id) {
    // Fallback to a loading state or redirect
    return <div>Loading...</div>;
  }

  const sidebarGroups = getDashboardSidebarGroups(
    organization.id,
    profile?.developerMode ?? false
  );

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
