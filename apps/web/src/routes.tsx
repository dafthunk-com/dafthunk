import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./components/protected-route.tsx";
import { AppLayout } from "./components/layouts/app-layout.tsx";
import { ErrorBoundary } from "./components/error-boundary";
import { PlaygroundPage } from "./pages/playground.tsx";
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
      <AppLayout sidebar={{ title: "Workflows", items: workflowsSidebarItems }}>
        <ProtectedRoute>
          <PlaygroundPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/workflows/playground/:id",
    element: (
      <AppLayout sidebar={{ title: "Workflows", items: workflowsSidebarItems }}>
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </AppLayout>
    ),
    loader: editorLoader,
    errorElement: <ErrorBoundary />,
  },
]);
