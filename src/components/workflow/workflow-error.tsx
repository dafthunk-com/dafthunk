import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { WorkflowErrorProps } from "./workflow-types";

export function WorkflowError({ message, details }: WorkflowErrorProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        {message}
        {details && (
          <div className="mt-2 text-xs whitespace-pre-wrap">{details}</div>
        )}
      </AlertDescription>
    </Alert>
  );
} 