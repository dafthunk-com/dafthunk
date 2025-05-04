import { useState, useEffect } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import {
  DeploymentWithActions,
  columns,
} from "@/components/deployments/deployment-columns";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { WorkflowDeployment } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { useNavigate } from "react-router-dom";
import { usePageBreadcrumbs } from "@/hooks/use-page";

export function DeploymentListPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const [deployments, setDeployments] = useState<WorkflowDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([{ label: "Deployments" }]);
  }, [setBreadcrumbs]);

  // Fetch the deployments
  const fetchDeployments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/deployments`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.statusText}`);
      }

      const data = await response.json();
      setDeployments(data.workflows);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to fetch deployments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load deployments on component mount
  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleViewDeployment = (workflowId: string) => {
    navigate(`/workflows/deployments/${workflowId}`);
  };

  // Add actions to the deployments
  const deploymentsWithActions: DeploymentWithActions[] = deployments.map(
    (deployment) => ({
      ...deployment,
      onViewLatest: handleViewDeployment,
      onCreateDeployment: () => {
        // No-op: dialog and selection removed
      },
    })
  );

  return (
    <TooltipProvider>
      <InsetLayout title="Deployments">
        <DataTable
          columns={columns}
          data={deploymentsWithActions}
          isLoading={isLoading}
          emptyState={{
            title: "No deployments found",
            description: "Deploy a workflow to get started.",
          }}
        />

        {!isLoading && (
          <div className="text-xs text-muted-foreground mt-4">
            Showing <strong>{deployments.length}</strong> workflow deployment
            {deployments.length !== 1 ? "s" : ""}.
          </div>
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
