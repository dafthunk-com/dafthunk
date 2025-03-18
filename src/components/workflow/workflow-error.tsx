import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface WorkflowErrorProps {
  message: string;
  onRetry?: () => void;
}

export function WorkflowError({ message, onRetry }: WorkflowErrorProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading workflow</AlertTitle>
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
