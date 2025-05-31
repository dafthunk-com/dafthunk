import { CreateWorkflowRequest, WorkflowType } from "@dafthunk/types";
import {
  Activity,
  CloudUpload,
  LayoutDashboard,
  PlusCircle,
  Workflow,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { createWorkflow, useWorkflows } from "@/services/workflow-service";

export function ReadyToBuildBlock() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { mutateWorkflows } = useWorkflows();

  const handleCreateWorkflow = async (name: string, type: WorkflowType) => {
    if (!orgHandle) return;

    try {
      const request: CreateWorkflowRequest = {
        name,
        type,
        nodes: [],
        edges: [],
      };

      const newWorkflow = await createWorkflow(request, orgHandle);

      mutateWorkflows();
      setIsCreateDialogOpen(false);
      navigate(`/workflows/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  return (
    <>
      <div className="bg-secondary p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="size-6" />
          Ready to Build?
        </h2>
        <p className="text-muted-foreground mb-6">
          Jump straight into the action. Create a new workflow or view your
          existing resources.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 size-4" /> Create Workflow
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="mr-2 size-4" /> Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/workflows">
              <Workflow className="mr-2 size-4" /> Workflows
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/deployments">
              <CloudUpload className="mr-2 size-4" /> Deployments
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/executions">
              <Activity className="mr-2 size-4" /> Executions
            </Link>
          </Button>
        </div>
      </div>
      <CreateWorkflowDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateWorkflow={handleCreateWorkflow}
      />
    </>
  );
}
