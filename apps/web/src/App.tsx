import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./components/auth-context";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AppLayout } from "./components/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/theme-provider";

function FallbackErrorUI() {
  return (
    <AppLayout>
      <main className="h-full">
        <div className="h-full rounded-xl border border-white overflow-hidden">
          <div className="relative h-full p-6 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold">Unexpected Error</h1>
              <p className="text-neutral-500 text-lg mt-2 mb-6">
                Something went wrong. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <ReactErrorBoundary FallbackComponent={FallbackErrorUI}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ReactErrorBoundary>
      </ThemeProvider>
    </>
  );
}

export default App;
