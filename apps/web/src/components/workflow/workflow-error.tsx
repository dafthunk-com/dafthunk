import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export interface WorkflowErrorProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function WorkflowError({ message, onRetry }: WorkflowErrorProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="size-4 inline-block mr-2 mb-1" />
        <AlertTitle className="inline-block mb-0">
          Error loading workflow
        </AlertTitle>
        <AlertDescription className="mt-2">
          {message || "Failed to load workflow. Please try again."}
        </AlertDescription>
        <div className="mt-4 flex justify-end">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => (window.location.href = "/")}
          >
            Go Home
          </Button>
        </div>
      </Alert>
    </div>
  );
}
