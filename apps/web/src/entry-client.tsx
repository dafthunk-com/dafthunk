import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ThemeProvider } from "@/components/theme-provider";

import App, { FallbackErrorUI } from "./app";
import { routes } from "./routes";

const rootElement = document.getElementById("root")!;

const rootRouter = createBrowserRouter([
  {
    element: <App />,
    children: routes,
    errorElement: (
      <StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <FallbackErrorUI />
        </ThemeProvider>
      </StrictMode>
    ),
  },
]);

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={rootRouter} />
  </StrictMode>
);
