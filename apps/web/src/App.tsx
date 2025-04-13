import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { AuthProvider } from "./components/authContext.tsx";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Layout } from "./components/layout";
import { Button } from "@/components/ui/button";
import { Inspiration } from "./components/ui/inspiration";

function FallbackErrorUI() {
  return (
    <Layout>
      <main className="h-full">
        <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div className="relative h-full p-6 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold">Unexpected Error</h1>
              <p className="text-gray-500 text-lg mt-2 mb-6">
                Something went wrong. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function App() {
  return (
    <>
      <ReactErrorBoundary FallbackComponent={FallbackErrorUI}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ReactErrorBoundary>
      <Inspiration />
    </>
  );
}

export default App;
