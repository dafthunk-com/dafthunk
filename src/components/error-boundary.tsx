import { useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "An unexpected error occurred";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else if (error && typeof error === "object" && "message" in error) {
    errorMessage = String(error.message);
  }

  return (
    <Layout>
      <main className="h-full">
        <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div className="relative h-full p-6 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
              <p className="text-gray-500 text-lg mt-2 mb-6">{errorMessage}</p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                >
                  Go Home
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
