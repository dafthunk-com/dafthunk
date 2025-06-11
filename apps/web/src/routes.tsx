import { KeyRound, Logs, SquareTerminal, Target, User, Database } from "lucide-react";
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
import { DocsApiPage } from "./pages/docs/api-page";
import { DocsOverviewPage } from "./pages/docs/concepts-page";
import { DocsDevelopersPage } from "./pages/docs/developers-page";
import { DocsNodesPage } from "./pages/docs/nodes-page";
import { DocsPage } from "./pages/docs-page";
import { HomePage } from "./pages/home-page";
import { LegalPage } from "./pages/legal";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { ProfilePage } from "./pages/profile-page";
import { WaitlistPage } from "./pages/waitlist-page";
import { DeploymentDetailPage } from "./pages/workflows/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/workflows/deployment-version-page";
import { DeploymentsPage } from "./pages/workflows/deployments-page";
import { EditorPage } from "./pages/workflows/editor-page";
import { ExecutionDetailPage } from "./pages/workflows/execution-detail-page";
import { ExecutionsPage } from "./pages/workflows/executions-page";
import { PublicExecutionPage } from "./pages/workflows/public-execution-page";
import { WorkflowsPage } from "./pages/workflows/workflows-page";
import { DatasetsPage } from "./pages/datasets/datasets-page";
import { DatasetDetailPage } from "./pages/datasets/dataset-detail-page";

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

const workflowsSidebarItems = [
  {
    title: "Workflows",
    url: "/workflows/workflows",
    icon: SquareTerminal,
  },
  {
    title: "Deployments",
    url: "/workflows/deployments",
    icon: Target,
  },
  {
    title: "Executions",
    url: "/workflows/executions",
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
    title: "API Keys",
    url: "/settings/api-keys",
    icon: KeyRound,
  },
];

const datasetsSidebarItems = [
  {
    title: "Datasets",
    url: "/datasets/datasets",
    icon: Database,
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
    path: "/waitlist",
    element: (
      <AppLayout className="bg-transparent border-none">
        <WaitlistPage />
      </AppLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Waitlist - Dafthunk"
          description="You're on the waitlist for Dafthunk. We'll notify you when your access is ready."
        />
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
    path: "/settings/api-keys",
    element: (
      <AppLayout
        sidebar={{
          title: "Settings",
          items: settingsSidebarItems,
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
    path: "/dashboard",
    element: (
      <AppLayout>
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Dashboard - Dafthunk" /> },
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
    path: "/datasets",
    element: <Navigate to="/datasets/datasets" replace />,
  },
  {
    path: "/datasets/datasets",
    element: (
      <AppLayout
        sidebar={{
          title: "Datasets",
          items: datasetsSidebarItems,
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
    path: "/datasets/datasets/:datasetId",
    element: (
      <AppLayout
        sidebar={{
          title: "Datasets",
          items: datasetsSidebarItems,
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
    path: "/workflows",
    element: <Navigate to="/workflows/workflows" replace />,
  },
  {
    path: "/workflows/workflows",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
    path: "/workflows/deployments",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
    path: "/workflows/deployments/:workflowId",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
          items: workflowsSidebarItems,
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
    path: "/workflows/executions",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
    path: "/workflows/executions/:executionId",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
    path: "/workflows/workflows/:id",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
