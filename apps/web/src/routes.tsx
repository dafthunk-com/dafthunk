import { KeyRound, Logs, SquareTerminal, Target, User } from "lucide-react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { ErrorBoundary } from "./components/error-boundary";
import { AppLayout } from "./components/layouts/app-layout";
import { ProtectedRoute } from "./components/protected-route";
import { ApiKeysPage } from "./pages/api-keys-page";
import { DashboardPage } from "./pages/dashboard-page";
import { DeploymentDetailPage } from "./pages/deployment-detail-page";
import { DeploymentVersionPage } from "./pages/deployment-version-page";
import { DeploymentsPage } from "./pages/deployments-page";
import { DocsPage } from "./pages/docs-page";
import { EditorPage } from "./pages/editor-page";
import { ExecutionDetailPage } from "./pages/execution-detail-page";
import { ExecutionsPage } from "./pages/executions-page";
import { HomePage } from "./pages/home-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PlaygroundPage } from "./pages/playground-page";
import { ProfilePage } from "./pages/profile-page";
import { PublicExecutionPage } from "./pages/public-execution-page";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppLayout>
        <HomePage />
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/docs",
    element: (
      <AppLayout>
        <DocsPage />
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
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
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/public/executions/:executionId",
    element: <PublicExecutionPage />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "*",
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
  },
]);
