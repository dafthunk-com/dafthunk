import { useState } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/deployments/data-table";
import { columns, Deployment } from "@/components/deployments/columns";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { Button } from "@/components/ui/button"; // Import if needed for create button

// Mock data for deployments (frozen workflow instances)
const mockDeployments: Deployment[] = [
  {
    id: "dep_abc123",
    workflowId: "wf_prod_email", // Example workflow ID
    workflowName: "Production Email Campaign",
    status: "active",
    commitHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    deployedAt: new Date(2024, 5, 15, 10, 0, 0), // June 15, 2024
  },
  {
    id: "dep_def456",
    workflowId: "wf_staging_report",
    workflowName: "Staging Daily Report",
    status: "inactive",
    commitHash: "f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1",
    deployedAt: new Date(2024, 5, 10, 16, 30, 0),
  },
  {
    id: "dep_ghi789",
    workflowId: "wf_dev_image_proc",
    workflowName: "Development Image Processing",
    status: "failed",
    commitHash: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    deployedAt: new Date(2024, 5, 16, 9, 15, 0),
  },
  {
    id: "dep_jkl012",
    workflowId: "wf_prod_email", // Same workflow, older deployment
    workflowName: "Production Email Campaign",
    status: "inactive", // Older deployment is now inactive
    commitHash: "b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0",
    deployedAt: new Date(2024, 4, 20, 12, 0, 0), // May 20, 2024
  },
];

export function DeploymentsPage() {
  // State for actual data fetching would go here
  const [deployments] = useState<Deployment[]>(mockDeployments);

  // Handler for creating a deployment (placeholder)
  // const handleCreateDeployment = () => {
  //   console.log("Create deployment clicked");
  //   // Add logic to open a dialog or navigate
  // };

  return (
    <TooltipProvider>
      <InsetLayout title="Deployments">
        <p className="text-muted-foreground mb-4">
          Manage your application deployments across different environments.
        </p>
        <DataTable
          columns={columns}
          data={deployments}
          // Pass the handler if you add a create button to DataTable
          // onCreateDeployment={handleCreateDeployment}
        />
        {/* Add Dialogs for actions like delete, redeploy etc. similar to PlaygroundPage if needed */}
      </InsetLayout>
    </TooltipProvider>
  );
}
