import Building2 from "lucide-react/icons/building-2";
import User from "lucide-react/icons/user";
import React from "react";
import type { RouteObject, RouterState } from "react-router";
import { Navigate } from "react-router";

import { HeadSeo } from "./components/head-seo";
import { AppLayout } from "./components/layouts/app-layout";
import { ContentLayout } from "./components/layouts/content-layout";
import { DocsLayout } from "./components/layouts/docs-layout";
import { OrgLayout } from "./components/org-layout";
import { OrgRedirect } from "./components/org-redirect";
import { ProtectedRoute } from "./components/protected-route";
import { ApiKeysPage } from "./pages/api-keys-page";
import { DashboardPage } from "./pages/dashboard-page";
import { DatasetDetailPage } from "./pages/dataset-detail-page";
import { DatasetsPage } from "./pages/datasets-page";
import { DeploymentDetailPage } from "./pages/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/deployment-version-page";
import { DeploymentsPage } from "./pages/deployments-page";
import { DocsApiPage } from "./pages/docs/api-page";
import { DocsOverviewPage } from "./pages/docs/concepts-page";
import { DocsDevelopersPage } from "./pages/docs/developers-page";
import { DocsNodesPage } from "./pages/docs/nodes-page";
import { DocsPage } from "./pages/docs-page";
import { EditorPage } from "./pages/editor-page";
import { ExecutionDetailPage } from "./pages/execution-detail-page";
import { ExecutionsPage } from "./pages/executions-page";
import { HomePage } from "./pages/home-page";
import { IntegrationsPage } from "./pages/integrations-page";
import { LegalPage } from "./pages/legal";
import { LoginPage } from "./pages/login-page";
import { MembersPage } from "./pages/members-page";
import { NotFoundPage } from "./pages/not-found-page";
import { OrganizationsPage } from "./pages/organizations-page";
import { ProfilePage } from "./pages/profile-page";
import { QueuesPage } from "./pages/queues-page";
import { SecretsPage } from "./pages/secrets-page";
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
    title: "Profile",
    url: "/settings/profile",
    icon: User,
  },
  {
    title: "Organizations",
    url: "/settings/organizations",
    icon: Building2,
  },
];

const footerItems = [];

export const routes: AppRouteObject[] = [
  {
    path: "/",
    element: <HomePage />,
    handle: {
      head: (
        <HeadSeo title="Dafthunk" description="Workflow execution platform." />
      ),
    },
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
          items: settingsSidebarItems,
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
  {
    path: "/org",
    element: <OrgRedirect to="/org/:handle/dashboard" />,
  },
  {
    path: "/settings/organizations",
    element: (
      <AppLayout
        sidebar={{
          title: "Organizations",
          items: settingsSidebarItems,
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
    path: "/legal",
    element: (
      <ContentLayout title="Terms of Service and Privacy Policy">
        <LegalPage />
      </ContentLayout>
    ),
    handle: { head: <HeadSeo title="Terms of Service and Privacy Policy" /> },
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
