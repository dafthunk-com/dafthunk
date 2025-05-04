import { useState, useEffect } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/executions/data-table";
import { columns, Execution } from "@/components/executions/columns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecutions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/executions`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch executions: ${response.statusText}`);
        }
        const data = await response.json();
        // Map API executions to Execution type expected by DataTable
        const mapped: Execution[] = (data.executions || []).map((exec: any) => {
          const startedAt = exec.startedAt
            ? new Date(exec.startedAt)
            : undefined;
          const endedAt = exec.endedAt ? new Date(exec.endedAt) : undefined;
          const status: Execution["status"] =
            exec.status === "executing"
              ? "running"
              : exec.status === "error"
                ? "failed"
                : exec.status;
          return {
            id: exec.id,
            workflowId: exec.workflowId,
            deploymentId: exec.deploymentId || undefined,
            status,
            startedAt: startedAt || new Date(),
            duration:
              startedAt && endedAt
                ? `${Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)}s`
                : undefined,
            endedAt,
          };
        });
        setExecutions(mapped);
      } catch (err) {
        setError((err as Error).message);
        toast.error("Failed to fetch executions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchExecutions();
  }, []);

  return (
    <TooltipProvider>
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        {isLoading ? (
          <div className="text-center py-8">Loading executions...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <DataTable columns={columns} data={executions} />
        )}
        {!isLoading && !error && (
          <div className="text-xs text-muted-foreground mt-4">
            Showing <strong>{executions.length}</strong> executions.
          </div>
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
