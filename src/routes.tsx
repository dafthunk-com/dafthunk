import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { ProfilePage } from "./pages/profile";
import { ProtectedRoute } from "./lib/auth/protected-route";
import { Layout } from "./components/layout";
import { ErrorBoundary } from "./components/error-boundary";

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
    path: "/workflow/:id",
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
]);
