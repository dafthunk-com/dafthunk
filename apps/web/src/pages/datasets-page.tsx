import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDataset,
  deleteDataset,
  useDatasets,
} from "@/services/dataset-service";

function useDatasetActions() {
  const { mutateDatasets } = useDatasets();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDataset = async () => {
    if (!datasetToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteDataset(datasetToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
      mutateDatasets();
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Dataset</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {datasetToDelete?.name || "Untitled Dataset"}"? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteDataset}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    openDeleteDialog: (dataset: any) => {
      setDatasetToDelete(dataset);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (dataset: any) => void,
  navigate: ReturnType<typeof useNavigate>,
  getOrgUrl: (path: string) => string
): ColumnDef<any>[] {
  return [
    {
      accessorKey: "name",
      header: "Dataset Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const datasetId = row.original.id;
        return (
          <Link
            to={getOrgUrl(`datasets/${datasetId}`)}
            className="hover:underline"
          >
            <div className="font-medium">{name || "Untitled Dataset"}</div>
          </Link>
        );
      },
    },
    {
      accessorKey: "handle",
      header: "Dataset Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        const datasetId = row.original.id;
        return (
          <Link
            to={getOrgUrl(`datasets/${datasetId}`)}
            className="font-mono text-xs hover:underline"
          >
            {handle}
          </Link>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const dataset = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(getOrgUrl(`datasets/${dataset.id}`))}
                >
                  View Dataset
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(dataset)}>
                  Delete Dataset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function DatasetsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const { getOrgUrl } = useOrgUrl();

  const { datasets, datasetsError, isDatasetsLoading, mutateDatasets } =
    useDatasets();

  const { deleteDialog, openDeleteDialog } = useDatasetActions();

  const columns = createColumns(openDeleteDialog, navigate, getOrgUrl);

  useEffect(() => {
    setBreadcrumbs([{ label: "Datasets" }]);
  }, [setBreadcrumbs]);

  const handleCreateDataset = async (name: string) => {
    if (!orgHandle) return;

    try {
      const newDataset = await createDataset({ name }, orgHandle);
      mutateDatasets();
      navigate(getOrgUrl(`datasets/${newDataset.id}`));
    } catch (error) {
      console.error("Failed to create dataset:", error);
    }
  };

  if (isDatasetsLoading) {
    return <InsetLoading title="Datasets" />;
  } else if (datasetsError) {
    return <InsetError title="Datasets" errorMessage={datasetsError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Datasets">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create, manage, and organize your datasets. Upload, process, and
            share your data with ease.
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Dataset
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={datasets || []}
          emptyState={{
            title: "No datasets found",
            description: "Create a new dataset to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dataset</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                await handleCreateDataset(name);
                setIsCreateDialogOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Dataset Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter dataset name"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Dataset</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
