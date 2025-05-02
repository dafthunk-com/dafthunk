import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./components/protected-route.tsx";
import { AppLayout } from "./components/layouts/app-layout.tsx";
import { ErrorBoundary } from "./components/error-boundary";
import { PlaygroundPage } from "./pages/playground.tsx";
import { DeploymentsPage } from "./pages/deployments.tsx";
import { ExecutionsPage } from "./pages/executions.tsx";
import { DocsPage } from "./pages/docs";
import { DashboardPage } from "./pages/dashboard";
import { ApiKeysPage } from "./pages/api-keys";
import { NotFoundPage } from "./pages/not-found.tsx";
import {
  SquareTerminal,
  Target,
  Logs,
  KeyRound,
  HelpCircle,
} from "lucide-react";

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

const footerItems = [
  {
    title: "Api Keys",
    url: "/api-keys",
    icon: KeyRound,
  },
  {
    title: "Help",
    url: "/help",
    icon: HelpCircle,
  },
];

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
    path: "/profile",
    element: (
      <AppLayout>
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: (
      <AppLayout>
        <DashboardPage />
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
    loader: editorLoader,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/api-keys",
    element: (
      <AppLayout
        sidebar={{
          title: "Workflows",
          items: workflowsSidebarItems,
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
    path: "*",
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
  },
]);
