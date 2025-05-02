import { useMemo } from "react";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/executions/data-table";
import { columns, Execution } from "@/components/executions/columns";
import { TooltipProvider } from "@/components/ui/tooltip";

// Helper to add seconds to a date for mock data
function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date);
  result.setSeconds(result.getSeconds() + seconds);
  return result;
}

// Mock data for executions
const now = new Date();
const mockExecutionsData: Omit<Execution, "duration">[] = [
  {
    id: "exec_aaa111",
    workflowId: "wf_prod_email",
    workflowName: "Production Email Campaign",
    deploymentId: "dep_abc123",
    status: "completed",
    trigger: "Schedule",
    startedAt: addSeconds(now, -3600), // 1 hour ago
    endedAt: addSeconds(now, -3540), // finished 60 seconds later
  },
  {
    id: "exec_bbb222",
    workflowId: "wf_staging_report",
    workflowName: "Staging Daily Report",
    status: "failed",
    trigger: "Manual",
    startedAt: addSeconds(now, -1800), // 30 mins ago
    endedAt: addSeconds(now, -1770), // failed 30 seconds later
  },
  {
    id: "exec_ccc333",
    workflowId: "wf_dev_image_proc",
    workflowName: "Development Image Processing",
    status: "running",
    trigger: "Webhook",
    startedAt: addSeconds(now, -60), // 1 min ago
    // No endedAt for running
  },
  {
    id: "exec_ddd444",
    workflowId: "wf_prod_email",
    workflowName: "Production Email Campaign",
    deploymentId: "dep_jkl012", // Older deployment
    status: "completed",
    trigger: "Schedule",
    startedAt: addSeconds(now, -86400), // 1 day ago
    endedAt: addSeconds(now, -86335), // finished 65 seconds later
  },
  {
    id: "exec_eee555",
    workflowId: "wf_new_feature",
    workflowName: "Beta Feature Rollout",
    status: "cancelled",
    trigger: "Manual",
    startedAt: addSeconds(now, -7200), // 2 hours ago
    endedAt: addSeconds(now, -7100), // cancelled after 100 seconds
  },
];

export function ExecutionsPage() {
  // Use useMemo to calculate duration for mock data - real data might have duration pre-calculated
  const executions = useMemo((): Execution[] => {
    return mockExecutionsData.map((exec) => ({
      ...exec,
      duration: exec.endedAt
        ? `${Math.round((exec.endedAt.getTime() - exec.startedAt.getTime()) / 1000)}s`
        : undefined,
    }));
  }, []);

  return (
    <TooltipProvider>
      <InsetLayout title="Executions">
        <p className="text-muted-foreground mb-4">
          Monitor the execution history of your workflows.
        </p>
        <DataTable columns={columns} data={executions} />
      </InsetLayout>
    </TooltipProvider>
  );
}
