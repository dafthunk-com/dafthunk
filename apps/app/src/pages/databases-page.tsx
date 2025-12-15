import { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";
import { Link } from "react-router";

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
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDatabase,
  deleteDatabase,
  useDatabases,
} from "@/services/database-service";

function useDatabaseActions() {
  const { mutateDatabases } = useDatabases();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteDatabase(databaseToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setDatabaseToDelete(null);
      mutateDatabases();
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Database</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {databaseToDelete?.name || "Untitled Database"}"? This action cannot
            be undone and all data in this database will be lost.
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
            onClick={handleDeleteDatabase}
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
    openDeleteDialog: (database: any) => {
      setDatabaseToDelete(database);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (database: any) => void,
  orgHandle: string
): ColumnDef<any>[] {
  return [
    {
      accessorKey: "name",
      header: "Database Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <span className="font-medium">{name || "Untitled Database"}</span>
        );
      },
    },
    {
      accessorKey: "handle",
      header: "Database Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        return <span className="text-sm text-muted-foreground">{handle}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const database = row.original;
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
                <DropdownMenuItem asChild>
                  <Link
                    to={`/org/${orgHandle}/databases/${database.id}/console`}
                  >
                    Open Console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(database)}>
                  Delete Database
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function DatabasesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { databases, databasesError, isDatabasesLoading, mutateDatabases } =
    useDatabases();

  const { deleteDialog, openDeleteDialog } = useDatabaseActions();

  const columns = createColumns(openDeleteDialog, orgHandle);

  useEffect(() => {
    setBreadcrumbs([{ label: "Databases" }]);
  }, [setBreadcrumbs]);

  const handleCreateDatabase = async (name: string) => {
    if (!orgHandle) return;

    try {
      await createDatabase({ name }, orgHandle);
      mutateDatabases();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create database:", error);
    }
  };

  if (isDatabasesLoading) {
    return <InsetLoading title="Databases" />;
  } else if (databasesError) {
    return (
      <InsetError title="Databases" errorMessage={databasesError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Databases">
        <div className="flex items-center justify-between mb-6  min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage SQLite databases for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Database
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={databases || []}
          emptyState={{
            title: "No databases found",
            description: "Create a new database to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Database</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                await handleCreateDatabase(name);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Database Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter database name"
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
                <Button type="submit">Create Database</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
