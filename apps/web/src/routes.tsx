import { createBrowserRouter, Navigate } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./components/protected-route.tsx";
import { AppLayout } from "./components/layouts/app-layout.tsx";
import { ErrorBoundary } from "./components/error-boundary";
import { PlaygroundPage } from "./pages/playground.tsx";
import { DeploymentListPage } from "./pages/deployment-list.tsx";
import { DeploymentDetailPage } from "./pages/deployment-detail.tsx";
import { DeploymentVersionPage } from "./pages/deployment-version.tsx";
import { ExecutionsPage } from "./pages/executions.tsx";
import { ExecutionDetailPage } from "./pages/execution-detail.tsx";
import { DocsPage } from "./pages/docs";
import { DashboardPage } from "./pages/dashboard";
import { NotFoundPage } from "./pages/not-found.tsx";
import { SquareTerminal, Target, Logs, KeyRound, User } from "lucide-react";
import { ApiKeysPage } from "./pages/api-keys.tsx";
import DataTableTestPage from "./pages/data-table-test";
import { SharedExecutionPage } from "./pages/shared-execution.tsx";

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
          <DeploymentListPage />
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
    path: "/workflows/deployments/version/:deploymentId",
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
    path: "/test/data-table",
    element: (
      <AppLayout>
        <DataTableTestPage />
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/share/executions/:executionId",
    element: (
      <AppLayout>
        <SharedExecutionPage />
      </AppLayout>
    ),
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
