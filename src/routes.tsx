import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/home";
import { EditorPage, editorLoader } from "./pages/editor";
import { EditorError } from "./components/workflow/workflow-error";

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
]);
