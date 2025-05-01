import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./components/protected-route.tsx";
import { Layout } from "./components/layout";
import { ErrorBoundary } from "./components/error-boundary";
import { WorkflowsPage } from "./pages/workflows";
import { DocsPage } from "./pages/docs";

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
    path: "/workflows",
    element: (
      <Layout>
        <ProtectedRoute>
          <WorkflowsPage />
        </ProtectedRoute>
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/workflows/:id",
    element: (
      <Layout>
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </Layout>
    ),
    loader: editorLoader,
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
    path: "/docs",
    element: (
      <Layout>
        <DocsPage />
      </Layout>
    ),
    errorElement: <ErrorBoundary />,
  }
]);
