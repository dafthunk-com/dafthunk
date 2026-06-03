import Building2 from "lucide-react/icons/building-2";
import Database from "lucide-react/icons/database";
import Inbox from "lucide-react/icons/inbox";
import LayoutDashboard from "lucide-react/icons/layout-dashboard";
import ListTodo from "lucide-react/icons/list-todo";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";

import Table from "lucide-react/icons/table";
import UserMinus from "lucide-react/icons/user-minus";
import Users from "lucide-react/icons/users";
import Workflow from "lucide-react/icons/workflow";
import { ReactNode } from "react";
import { Toaster } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PageProvider } from "@/components/page-context";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import type { NavMainProps } from "@/components/sidebar/nav-main";
import * as Sidebar from "@/components/ui/sidebar";
import { useAdminSupportUnreadCount } from "@/services/admin-service";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { unreadCount } = useAdminSupportUnreadCount();

  const adminSidebarItems: NavMainProps["groups"] = [
    {
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
          end: true,
        },
        {
          title: "Support",
          url: "/admin/support",
          icon: Inbox,
          badgeCount: unreadCount,
        },
        {
          title: "Users",
          url: "/admin/users",
          icon: Users,
        },
        {
          title: "Onboarding",
          url: "/admin/onboarding",
          icon: UserMinus,
        },
        {
          title: "Organizations",
          url: "/admin/organizations",
          icon: Building2,
        },
        {
          title: "Workflows",
          url: "/admin/workflows",
          icon: Workflow,
        },
        {
          title: "Executions",
          url: "/admin/executions",
          icon: Play,
        },
        {
          title: "Emails",
          url: "/admin/emails",
          icon: Mail,
        },
        {
          title: "Queues",
          url: "/admin/queues",
          icon: ListTodo,
        },
        {
          title: "Datasets",
          url: "/admin/datasets",
          icon: Table,
        },
        {
          title: "Databases",
          url: "/admin/databases",
          icon: Database,
        },
      ],
    },
  ];

  return (
    <PageProvider>
      <div className="flex h-screen w-screen overflow-hidden flex-col">
        <AppHeader />
        <Toaster />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar.SidebarProvider>
            <AppSidebar title="Admin" groups={adminSidebarItems} />
            <Sidebar.SidebarInset className="bg-neutral-50 dark:bg-neutral-800">
              <div className="h-full w-full overflow-y-auto">{children}</div>
            </Sidebar.SidebarInset>
          </Sidebar.SidebarProvider>
        </div>
      </div>
    </PageProvider>
  );
}
