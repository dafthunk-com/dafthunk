import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { EditorError } from "./components/workflow/workflow-error";
import WorkflowExample from "./pages/examples/workflow-example";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/workflow/:id",
    element: <EditorPage />,
    loader: editorLoader,
    errorElement: <EditorError />,
  },
  {
    path: "/examples/workflow",
    element: <WorkflowExample />,
  },
]);
