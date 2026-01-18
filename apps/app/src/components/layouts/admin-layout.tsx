import Building2 from "lucide-react/icons/building-2";
import Database from "lucide-react/icons/database";
import LayoutDashboard from "lucide-react/icons/layout-dashboard";
import ListTodo from "lucide-react/icons/list-todo";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";
import Rocket from "lucide-react/icons/rocket";
import Table from "lucide-react/icons/table";
import Users from "lucide-react/icons/users";
import Workflow from "lucide-react/icons/workflow";
import { ReactNode } from "react";
import { Toaster } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PageProvider } from "@/components/page-context";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import type { NavMainProps } from "@/components/sidebar/nav-main";
import * as Sidebar from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

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
        title: "Users",
        url: "/admin/users",
        icon: Users,
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
        title: "Deployments",
        url: "/admin/deployments",
        icon: Rocket,
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

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <PageProvider>
      <div className="flex h-screen w-screen overflow-hidden flex-col">
        <AppHeader />
        <Toaster />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar.SidebarProvider>
            <AppSidebar title="Admin" groups={adminSidebarItems} />
            <Sidebar.SidebarInset>
              <div className="h-full w-full overflow-y-auto">{children}</div>
            </Sidebar.SidebarInset>
          </Sidebar.SidebarProvider>
        </div>
      </div>
    </PageProvider>
  );
}
