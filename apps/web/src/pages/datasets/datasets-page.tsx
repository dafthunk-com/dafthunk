import { useEffect } from "react";
import { useNavigate } from "react-router";

import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { Plus } from "lucide-react";

export function DatasetsPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Datasets" }]);
  }, [setBreadcrumbs]);

  return (
    <TooltipProvider>
      <InsetLayout title="Datasets">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create, manage, and organize your datasets. Upload, process, and share your data with ease.
          </div>
          <div className="flex gap-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New Dataset
            </Button>
          </div>
        </div>
        <DataTable
          columns={[]}
          data={[]}
          emptyState={{
            title: "No datasets found",
            description: "Create a new dataset to get started.",
          }}
        />
      </InsetLayout>
    </TooltipProvider>
  );
} 