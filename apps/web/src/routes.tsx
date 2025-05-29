import { KeyRound, Logs, SquareTerminal, Target, User } from "lucide-react";
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
import { DeploymentDetailPage } from "./pages/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/deployment-version-page";
import { DeploymentsPage } from "./pages/deployments-page";
import { DocsApiPage } from "./pages/docs/api-page";
import { DocsNodesPage } from "./pages/docs/nodes-page";
import { DocsOverviewPage } from "./pages/docs/overview-page";
import { DocsWorkflowsPage } from "./pages/docs/workflows-page";
import { DocsPage } from "./pages/docs-page";
import { EditorPage } from "./pages/editor-page";
import { ExecutionDetailPage } from "./pages/execution-detail-page";
import { ExecutionsPage } from "./pages/executions-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PlaygroundPage } from "./pages/playground-page";
import { PrivacyPage } from "./pages/privacy-page";
import { ProfilePage } from "./pages/profile-page";
import { PublicExecutionPage } from "./pages/public-execution-page";
import { TermsPage } from "./pages/terms-page";

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
    title: "Playground",
    url: "/workflows/playground",
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
      <DocsLayout
        title="Documentation"
        description="Explore the Dafthunk documentation and learn how to build powerful workflow automations."
        badge="v1.0"
      >
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
    path: "/docs/overview",
    element: (
      <DocsLayout
        title="Dafthunk Documentation"
        description="Dafthunk is a powerful visual workflow automation platform built on Cloudflare's edge infrastructure. Create, manage, and execute complex workflows with our intuitive drag-and-drop editor."
        badge="v1.0"
        navigation={{
          next: {
            title: "Workflows",
            href: "/docs/workflows",
          },
        }}
      >
        <DocsOverviewPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Overview - Documentation - Dafthunk"
          description="Get started with Dafthunk's core concepts and features."
        />
      ),
    },
  },
  {
    path: "/docs/workflows",
    element: (
      <DocsLayout
        title="Workflows Documentation"
        description="Learn how to create, manage, and execute workflows in Dafthunk. Build powerful automation flows using our visual editor."
        navigation={{
          previous: {
            title: "Overview",
            href: "/docs/overview",
          },
          next: {
            title: "Nodes Reference",
            href: "/docs/nodes",
          },
        }}
      >
        <DocsWorkflowsPage />
      </DocsLayout>
    ),
    handle: {
      head: (
        <HeadSeo
          title="Workflows - Documentation - Dafthunk"
          description="Learn how to create, manage, and execute workflows in Dafthunk."
        />
      ),
    },
  },
  {
    path: "/docs/nodes",
    element: (
      <DocsLayout
        title="Nodes Reference"
        description="Comprehensive reference for all 50+ node types available in Dafthunk."
        badge="50+ nodes"
        navigation={{
          previous: {
            title: "Workflows",
            href: "/docs/workflows",
          },
          next: {
            title: "API Reference",
            href: "/docs/api",
          },
        }}
      >
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
      <DocsLayout
        title="API Reference"
        description="Complete API documentation for integrating with Dafthunk workflows."
        navigation={{
          previous: {
            title: "Nodes Reference",
            href: "/docs/nodes",
          },
        }}
      >
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
    path: "/workflows",
    element: <Navigate to="/workflows/playground" replace />,
  },
  {
    path: "/workflows/playground",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
          footerItems: footerItems,
        }}
      >
        <ProtectedRoute>
          <PlaygroundPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    handle: { head: <HeadSeo title="Playground - Workflows - Dafthunk" /> },
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
    path: "/workflows/playground/:id",
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
    path: "/privacy",
    element: (
      <ContentLayout title="Privacy Policy">
        <PrivacyPage />
      </ContentLayout>
    ),
    handle: { head: <HeadSeo title="Privacy Policy - Dafthunk" /> },
  },
  {
    path: "/terms",
    element: (
      <ContentLayout title="Terms of Service">
        <TermsPage />
      </ContentLayout>
    ),
    handle: { head: <HeadSeo title="Terms of Service - Dafthunk" /> },
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
