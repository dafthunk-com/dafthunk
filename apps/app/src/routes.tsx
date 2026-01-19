import Building2 from "lucide-react/icons/building-2";
import Mail from "lucide-react/icons/mail";
import User from "lucide-react/icons/user";
import React from "react";
import type { RouteObject, RouterState } from "react-router";
import { Navigate } from "react-router";

import { AdminProtectedRoute } from "./components/admin-protected-route";
import { HeadSeo } from "./components/head-seo";
import { AdminLayout } from "./components/layouts/admin-layout";
import { AppLayout } from "./components/layouts/app-layout";
import { DocsLayout } from "./components/layouts/docs-layout";
import { OrgLayout } from "./components/org-layout";
import { OrgRedirect } from "./components/org-redirect";
import { ProtectedRoute } from "./components/protected-route";
import { AdminDashboardPage } from "./pages/admin/admin-dashboard-page";
import { AdminDatabasesPage } from "./pages/admin/admin-databases-page";
import { AdminDatasetsPage } from "./pages/admin/admin-datasets-page";
import { AdminDeploymentsPage } from "./pages/admin/admin-deployments-page";
import { AdminEmailsPage } from "./pages/admin/admin-emails-page";
import { AdminExecutionsPage } from "./pages/admin/admin-executions-page";
import { AdminOrganizationDetailPage } from "./pages/admin/admin-organization-detail-page";
import { AdminOrganizationsPage } from "./pages/admin/admin-organizations-page";
import { AdminQueuesPage } from "./pages/admin/admin-queues-page";
import { AdminUserDetailPage } from "./pages/admin/admin-user-detail-page";
import { AdminUsersPage } from "./pages/admin/admin-users-page";
import { AdminWorkflowsPage } from "./pages/admin/admin-workflows-page";
import { ApiKeysPage } from "./pages/api-keys-page";
import { BillingPage } from "./pages/billing-page";
import { DashboardPage } from "./pages/dashboard-page";
import { DatabaseConsolePage } from "./pages/database-console-page";
import { DatabasesPage } from "./pages/databases-page";
import { DatasetDetailPage } from "./pages/dataset-detail-page";
import { DatasetsPage } from "./pages/datasets-page";
import { DeploymentDetailPage } from "./pages/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/deployment-version-page";
import { DeploymentsPage } from "./pages/deployments-page";
import { DocsApiPage } from "./pages/docs/api-page";
import { DocsOverviewPage } from "./pages/docs/concepts-page";
import { DocsDevelopersPage } from "./pages/docs/developers-page";
import { DocsNodesLibraryPage } from "./pages/docs/nodes-library-page";
import { DocsNodesPage } from "./pages/docs/nodes-page";
import { DocsPage } from "./pages/docs-page";
import { EditorPage } from "./pages/editor-page";
import { EmailsPage } from "./pages/emails-page";
import { EvaluationsPage } from "./pages/evaluations-page";
import { ExecutionDetailPage } from "./pages/execution-detail-page";
import { ExecutionsPage } from "./pages/executions-page";
import { FeedbackPage } from "./pages/feedback-page";
import { IntegrationsPage } from "./pages/integrations-page";
import { InvitationsPage } from "./pages/invitations-page";
import { LoginPage } from "./pages/login-page";
import { McpPage } from "./pages/mcp-page";
import { MembersPage } from "./pages/members-page";
import { NotFoundPage } from "./pages/not-found-page";
import { OrganizationsPage } from "./pages/organizations-page";
import { ProfilePage } from "./pages/profile-page";
import { QueuesPage } from "./pages/queues-page";
import { SecretsPage } from "./pages/secrets-page";
import { TemplateDetailPage } from "./pages/template-detail-page";
import { TemplatePreviewPage } from "./pages/template-preview-page";
import { WorkflowsPage } from "./pages/workflows-page";

export interface RouteHandle {
  head?:
    | React.ReactElement
    | ((
        params: Readonly<Record<string, string | undefined>>,
        context: {
          url: URL;
          location: RouterState["location"];
        }
      ) => React.ReactElement);
}

export type AppRouteObject = RouteObject & {
  handle?: RouteHandle;
};

const settingsSidebarItems = [
  {
    items: [
      {
        title: "Profile",
        url: "/settings/profile",
        icon: User,
      },
      {
        title: "Organizations",
        url: "/settings/organizations",
        icon: Building2,
      },
      {
        title: "Invitations",
        url: "/settings/invitations",
        icon: Mail,
      },
    ],
  },
];

const footerItems = [];

export const routes: AppRouteObject[] = [
  {
    path: "/",
    element: <OrgRedirect to="/org/:handle/dashboard" />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    handle: {
      head: (
        <HeadSeo title="Login - Dafthunk" description="Login to Dafthunk." />
      ),
    },
  },
  {
    path: "/settings",
    element: <Navigate to="/settings/profile" replace />,
  },
  {
    path: "/settings/profile",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          groups: settingsSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Profile - Settings - Dafthunk" /> },
  },
  // Admin routes
  {
    path: "/admin",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminDashboardPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Admin Dashboard - Dafthunk" /> },
  },
  {
    path: "/admin/users",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminUsersPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Users - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/users/:userId",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminUserDetailPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="User Details - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/organizations",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminOrganizationsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Organizations - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/organizations/:organizationId",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminOrganizationDetailPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: {
      head: <HeadSeo title="Organization Details - Admin - Dafthunk" />,
    },
  },
  {
    path: "/admin/workflows",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminWorkflowsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Workflows - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/deployments",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminDeploymentsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Deployments - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/executions",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminExecutionsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Executions - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/emails",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminEmailsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Emails - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/queues",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminQueuesPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Queues - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/datasets",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminDatasetsPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Datasets - Admin - Dafthunk" /> },
  },
  {
    path: "/admin/databases",
    element: (
      <AdminLayout>
        <AdminProtectedRoute>
          <AdminDatabasesPage />
        </AdminProtectedRoute>
      </AdminLayout>
    ),
    handle: { head: <HeadSeo title="Databases - Admin - Dafthunk" /> },
  },
  {
    path: "/org",
    element: <OrgRedirect to="/org/:handle/dashboard" />,
  },
  {
    path: "/settings/organizations",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          groups: settingsSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <OrganizationsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Organizations - Dafthunk" /> },
  },
  {
    path: "/settings/invitations",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          groups: settingsSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <InvitationsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Invitations - Dafthunk" /> },
  },
  {
    path: "/org/:handle/dashboard",
    element: (
      <OrgLayout title="Dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Dashboard - Dafthunk" /> },
  },
  {
    path: "/workflows",
    element: <OrgRedirect to="/org/:handle/workflows" />,
  },
  {
    path: "/org/:handle/workflows",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <WorkflowsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Workflows - Workflows - Dafthunk" /> },
  },
  {
    path: "/org/:handle/templates/:templateId",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <TemplateDetailPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Template Details - Dafthunk" /> },
  },
  {
    path: "/executions",
    element: <OrgRedirect to="/org/:handle/executions" />,
  },
  {
    path: "/org/:handle/executions",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <ExecutionsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Executions - Workflows - Dafthunk" /> },
  },
  {
    path: "/evaluations",
    element: <OrgRedirect to="/org/:handle/evaluations" />,
  },
  {
    path: "/org/:handle/evaluations",
    element: (
      <OrgLayout title="Analytics">
        <ProtectedRoute>
          <EvaluationsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Evaluations - Analytics - Dafthunk" /> },
  },
  {
    path: "/datasets",
    element: <OrgRedirect to="/org/:handle/datasets" />,
  },
  {
    path: "/org/:handle/datasets",
    element: (
      <OrgLayout title="Datasets">
        <ProtectedRoute>
          <DatasetsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Datasets - Datasets - Dafthunk" /> },
  },
  {
    path: "/feedback",
    element: <OrgRedirect to="/org/:handle/feedback" />,
  },
  {
    path: "/org/:handle/feedback",
    element: (
      <OrgLayout title="Analytics">
        <ProtectedRoute>
          <FeedbackPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Feedback - Analytics - Dafthunk" /> },
  },
  {
    path: "/api-keys",
    element: <OrgRedirect to="/org/:handle/api-keys" />,
  },
  {
    path: "/members",
    element: <OrgRedirect to="/org/:handle/members" />,
  },
  {
    path: "/org/:handle/api-keys",
    element: (
      <OrgLayout title="Settings">
        <ProtectedRoute>
          <ApiKeysPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="API Keys - Settings - Dafthunk" /> },
  },
  {
    path: "/billing",
    element: <OrgRedirect to="/org/:handle/billing" />,
  },
  {
    path: "/org/:handle/billing",
    element: (
      <OrgLayout title="Settings">
        <ProtectedRoute>
          <BillingPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Billing - Settings - Dafthunk" /> },
  },
  {
    path: "/org/:handle/mcp",
    element: (
      <OrgLayout title="Settings">
        <ProtectedRoute>
          <McpPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="MCP Server - Settings - Dafthunk" /> },
  },
  {
    path: "/org/:handle/members",
    element: (
      <OrgLayout title="Organization Members">
        <ProtectedRoute>
          <MembersPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Members - Organization - Dafthunk" /> },
  },
  {
    path: "/secrets",
    element: <OrgRedirect to="/org/:handle/secrets" />,
  },
  {
    path: "/org/:handle/secrets",
    element: (
      <OrgLayout title="Settings">
        <ProtectedRoute>
          <SecretsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Secrets - Settings - Dafthunk" /> },
  },
  {
    path: "/integrations",
    element: <OrgRedirect to="/org/:handle/integrations" />,
  },
  {
    path: "/org/:handle/integrations",
    element: (
      <OrgLayout title="Settings">
        <ProtectedRoute>
          <IntegrationsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Integrations - Settings - Dafthunk" /> },
  },
  {
    path: "/docs",
    element: (
      <DocsLayout>
        <DocsPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Documentation - Dafthunk"
          description="Explore the Dafthunk documentation."
        />
      ),
    },
  },
  {
    path: "/docs/concepts",
    element: (
      <DocsLayout>
        <DocsOverviewPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Core Concepts - Documentation - Dafthunk"
          description="Get started with Dafthunk's core concepts and features."
        />
      ),
    },
  },
  {
    path: "/docs/nodes",
    element: (
      <DocsLayout>
        <DocsNodesPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Nodes Reference - Documentation - Dafthunk"
          description="Comprehensive reference for all 50+ node types available in Dafthunk."
        />
      ),
    },
  },
  {
    path: "/docs/nodes-library",
    element: (
      <DocsLayout>
        <DocsNodesLibraryPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Node Library - Documentation - Dafthunk"
          description="Browse and search all available nodes in Dafthunk's extensive library."
        />
      ),
    },
  },
  {
    path: "/docs/api",
    element: (
      <DocsLayout>
        <DocsApiPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="API Reference - Documentation - Dafthunk"
          description="Complete API documentation for integrating with Dafthunk workflows."
        />
      ),
    },
  },
  {
    path: "/docs/developers",
    element: (
      <DocsLayout>
        <DocsDevelopersPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Developers Guide - Documentation - Dafthunk"
          description="Complete developers guide for contributing to Dafthunk."
        />
      ),
    },
  },
  {
    path: "/org/:handle/datasets/:datasetId",
    element: (
      <OrgLayout title="Datasets">
        <ProtectedRoute>
          <DatasetDetailPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Dataset Details - Datasets - Dafthunk" /> },
  },
  {
    path: "/databases",
    element: <OrgRedirect to="/org/:handle/databases" />,
  },
  {
    path: "/org/:handle/databases",
    element: (
      <OrgLayout title="Databases">
        <ProtectedRoute>
          <DatabasesPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Databases - Databases - Dafthunk" /> },
  },
  {
    path: "/org/:handle/databases/:id/console",
    element: (
      <OrgLayout title="Database Console">
        <ProtectedRoute>
          <DatabaseConsolePage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Console - Database - Dafthunk" /> },
  },
  {
    path: "/queues",
    element: <OrgRedirect to="/org/:handle/queues" />,
  },
  {
    path: "/org/:handle/queues",
    element: (
      <OrgLayout title="Queues">
        <ProtectedRoute>
          <QueuesPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Queues - Queues - Dafthunk" /> },
  },
  {
    path: "/emails",
    element: <OrgRedirect to="/org/:handle/emails" />,
  },
  {
    path: "/org/:handle/emails",
    element: (
      <OrgLayout title="Emails">
        <ProtectedRoute>
          <EmailsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Emails - Emails - Dafthunk" /> },
  },
  {
    path: "/deployments",
    element: <OrgRedirect to="/org/:handle/deployments" />,
  },
  {
    path: "/org/:handle/deployments",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <DeploymentsPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Deployments - Workflows - Dafthunk" /> },
  },
  {
    path: "/org/:handle/deployments/:workflowId",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <DeploymentDetailPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: {
      head: <HeadSeo title="Deployment Details - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/org/:handle/deployment/:deploymentId",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <DeploymentVersionPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: {
      head: <HeadSeo title="Deployment Version - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/org/:handle/executions/:executionId",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <ExecutionDetailPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: {
      head: <HeadSeo title="Execution Details - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/org/:handle/workflows/:id",
    element: (
      <OrgLayout title="Workflows">
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </OrgLayout>
    ),
    handle: { head: <HeadSeo title="Edit Workflow - Dafthunk" /> },
  },
  {
    path: "/embed/templates/:templateId",
    element: <TemplatePreviewPage />,
    handle: {
      head: <HeadSeo title="Template Preview - Dafthunk" />,
    },
  },
  {
    path: "*",
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Page Not Found - Dafthunk" /> },
  },
];
