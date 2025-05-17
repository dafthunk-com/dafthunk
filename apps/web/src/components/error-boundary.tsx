import { useRouteError } from "react-router";

import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@/components/ui/button";

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
    <AppLayout>
      <main className="h-full">
        <div className="h-full rounded-md border overflow-hidden bg-background">
          <div className="relative h-full p-6 overflow-auto">
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
              <p className="text-neutral-500 text-lg mt-2 mb-6">
                {errorMessage}
              </p>
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
    </AppLayout>
  );
}
