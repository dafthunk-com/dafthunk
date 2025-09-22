import {
  Building2,
  Database,
  KeyRound,
  LayoutDashboard,
  Lock,
  Logs,
  SquareTerminal,
  Target,
  User,
} from "lucide-react";
import React from "react";
import type { RouteObject, RouterState } from "react-router";
import { Navigate } from "react-router";

import { HeadSeo } from "./components/head-seo";
import { AppLayout } from "./components/layouts/app-layout";
import { ContentLayout } from "./components/layouts/content-layout";
import { DocsLayout } from "./components/layouts/docs-layout";
import { ProtectedRoute } from "./components/protected-route";
import { getApiBaseUrl } from "./config/api";
import { ApiKeysPage } from "./pages/api-keys-page";
import { DashboardPage } from "./pages/dashboard-page";
import { DatasetDetailPage } from "./pages/dataset-detail-page";
import { DatasetsPage } from "./pages/datasets-page";
import { DocsApiPage } from "./pages/docs/api-page";
import { DocsOverviewPage } from "./pages/docs/concepts-page";
import { DocsDevelopersPage } from "./pages/docs/developers-page";
import { DocsNodesPage } from "./pages/docs/nodes-page";
import { DocsPage } from "./pages/docs-page";
import { HomePage } from "./pages/home-page";
import { LegalPage } from "./pages/legal";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { OrganizationsPage } from "./pages/organizations-page";
import { ProfilePage } from "./pages/profile-page";
import { SecretsPage } from "./pages/secrets-page";
import { DeploymentDetailPage } from "./pages/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/deployment-version-page";
import { DeploymentsPage } from "./pages/deployments-page";
import { EditorPage } from "./pages/editor-page";
import { ExecutionDetailPage } from "./pages/execution-detail-page";
import { ExecutionsPage } from "./pages/executions-page";
import { PublicExecutionPage } from "./pages/public-execution-page";
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

const dashboardSidebarItems = [
  {
    title: "Dashboard",
    url: "/org/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Workflows",
    url: "/org/workflows",
    icon: SquareTerminal,
  },

  {
    title: "Datasets",
    url: "/org/datasets",
    icon: Database,
  },
  {
    title: "Secrets",
    url: "/org/secrets",
    icon: Lock,
  },
  {
    title: "API Keys",
    url: "/org/api-keys",
    icon: KeyRound,
  },
  {
    title: "Deployments",
    url: "/org/deployments",
    icon: Target,
  },
  {
    title: "Executions",
    url: "/org/executions",
    icon: Logs,
  },
];

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
    path: "/org/dashboard",
    element: (
      <AppLayout
        sidebar={{
          title: "Dashboard",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Dashboard - Dafthunk" /> },
  },
  {
    path: "/workflows",
    element: <Navigate to="/org/workflows" replace />,
  },
  {
    path: "/org/workflows",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <WorkflowsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Workflows - Workflows - Dafthunk" /> },
  },
  {
    path: "/org/deployments",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DeploymentsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Deployments - Workflows - Dafthunk" /> },
  },
  {
    path: "/org/executions",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <ExecutionsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Executions - Workflows - Dafthunk" /> },
  },
  {
    path: "/datasets",
    element: <Navigate to="/org/datasets" replace />,
  },
  {
    path: "/org/datasets",
    element: (
      <AppLayout
        sidebar={{
          title: "Datasets",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DatasetsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Datasets - Datasets - Dafthunk" /> },
  },
  {
    path: "/org/api-keys",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <ApiKeysPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="API Keys - Settings - Dafthunk" /> },
  },
  {
    path: "/org/secrets",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <SecretsPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Secrets - Settings - Dafthunk" /> },
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
    path: "/org/datasets/:datasetId",
    element: (
      <AppLayout
        sidebar={{
          title: "Datasets",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DatasetDetailPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Dataset Details - Datasets - Dafthunk" /> },
  },
  {
    path: "/workflows/deployments/:workflowId",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DeploymentDetailPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: {
      head: <HeadSeo title="Deployment Details - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/workflows/deployment/:deploymentId",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <DeploymentVersionPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: {
      head: <HeadSeo title="Deployment Version - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/workflows/executions/:executionId",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <ExecutionDetailPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: {
      head: <HeadSeo title="Execution Details - Workflows - Dafthunk" />,
    },
  },
  {
    path: "/org/workflows/:id",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: dashboardSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Edit Workflow - Dafthunk" /> },
  },
  {
    path: "/public/executions/:executionId",
    element: <PublicExecutionPage />,
    handle: {
      head: (params, context) => {
        const executionId = params.executionId!;
        const origin = context.url.origin;

        const pageTitle = `Shared Execution - Dafthunk`;
        const pageDescription =
          "View the details of a shared workflow execution.";
        const ogImageUrl = `${getApiBaseUrl()}/public/images/og-execution-${executionId}.jpeg`;
        const ogUrl = `${origin}/public/executions/${executionId}`;

        return (
          <HeadSeo
            title={pageTitle}
            description={pageDescription}
            ogImage={ogImageUrl}
            ogUrl={ogUrl}
            ogTitle={pageTitle}
            ogDescription={pageDescription}
            twitterCard="summary_large_image"
            twitterSite="https://dafthunk.com"
            twitterTitle={pageTitle}
            twitterDescription={pageDescription}
            twitterImage={ogImageUrl}
            twitterUrl={ogUrl}
          />
        );
      },
    },
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
