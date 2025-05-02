import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./components/protected-route.tsx";
import { Layout } from "./components/layout";
import { ErrorBoundary } from "./components/error-boundary";
import { WorkflowsPage } from "./pages/workflows";
import { DocsPage } from "./pages/docs";
import { DashboardPage } from "./pages/dashboard";
import { SquareTerminal, Target, Logs } from "lucide-react";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout>
        <HomePage />
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/profile",
    element: (
      <Layout>
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: (
      <Layout>
        <DashboardPage />
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/docs",
    element: (
      <Layout>
        <DocsPage />
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/workflows/playground",
    element: (
      <Layout sidebar={{ title: "Workflows", items: workflowsSidebarItems }}>
        <ProtectedRoute>
          <WorkflowsPage />
        </ProtectedRoute>
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/workflows/playground/:id",
    element: (
      <Layout sidebar={{ title: "Workflows", items: workflowsSidebarItems }}>
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </Layout>
    ),
    loader: editorLoader,
    errorElement: <ErrorBoundary />,
  },
]);
