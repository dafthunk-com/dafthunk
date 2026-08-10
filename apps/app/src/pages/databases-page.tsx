import { IDENTIFIER_PATTERN } from "@dafthunk/types";
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
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDatabase,
  deleteDatabase,
  updateDatabase,
  useDatabases,
} from "@/services/database-service";
import { cn } from "@/utils/utils";

function useDatabaseActions() {
  const { mutateDatabases } = useDatabases();
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [databaseToEdit, setDatabaseToEdit] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const isEditNameValid =
    editName.trim().length > 0 && IDENTIFIER_PATTERN.test(editName.trim());

  const handleEditDatabase = async () => {
    if (!databaseToEdit || !orgId || !isEditNameValid) return;
    setIsEditing(true);
    try {
      await updateDatabase(
        databaseToEdit.id,
        { name: editName.trim(), description: editDescription.trim() },
        orgId
      );
      setEditDialogOpen(false);
      setDatabaseToEdit(null);
      mutateDatabases();
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete || !orgId) return;
    setIsDeleting(true);
    try {
      await deleteDatabase(databaseToDelete.id, orgId);
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

  const editDialog = (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Database</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-database-name">Name</Label>
            <Input
              id="edit-database-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={cn(
                "mt-2",
                editName.trim().length > 0 &&
                  !IDENTIFIER_PATTERN.test(editName.trim()) &&
                  "border-destructive"
              )}
            />
            {editName.trim().length > 0 &&
              !IDENTIFIER_PATTERN.test(editName.trim()) && (
                <p className="text-xs text-destructive mt-1">
                  Letters, digits, and underscores only (e.g. my_database)
                </p>
              )}
          </div>
          <div>
            <Label htmlFor="edit-database-description">Description</Label>
            <Textarea
              id="edit-database-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="What this database stores and what it is for"
              className="mt-2"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(false)}
            disabled={isEditing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditDatabase}
            disabled={isEditing || !isEditNameValid}
          >
            {isEditing ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    editDialog,
    openDeleteDialog: (database: any) => {
      setDatabaseToDelete(database);
      setDeleteDialogOpen(true);
    },
    openEditDialog: (database: any) => {
      setDatabaseToEdit(database);
      setEditName(database.name || "");
      setEditDescription(database.description || "");
      setEditDialogOpen(true);
    },
  };
}

function createColumns(
  openEditDialog: (database: any) => void,
  openDeleteDialog: (database: any) => void,
  orgId: string
): ColumnDef<any>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <span className="font-medium">{name || "Untitled Database"}</span>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-muted-foreground truncate max-w-md">
          {(row.getValue("description") as string) || "—"}
        </div>
      ),
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
                  <Link to={`/org/${orgId}/databases/${database.id}/explorer`}>
                    Open Explorer
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/org/${orgId}/databases/${database.id}/console`}>
                    Open Console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(database)}>
                  Edit Database
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
  const [newDatabaseName, setNewDatabaseName] = useState("");
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const { databases, databasesError, isDatabasesLoading, mutateDatabases } =
    useDatabases();

  const { deleteDialog, editDialog, openDeleteDialog, openEditDialog } =
    useDatabaseActions();

  const columns = createColumns(openEditDialog, openDeleteDialog, orgId);

  useEffect(() => {
    setBreadcrumbs([{ label: "Databases" }]);
  }, [setBreadcrumbs]);

  const handleCreateDatabase = async (name: string, description: string) => {
    if (!orgId) return;

    try {
      await createDatabase({ name, description }, orgId);
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
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setNewDatabaseName("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Database</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const description = (
                  (formData.get("description") as string) || ""
                ).trim();
                await handleCreateDatabase(newDatabaseName.trim(), description);
                setNewDatabaseName("");
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Database Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newDatabaseName}
                  onChange={(e) => setNewDatabaseName(e.target.value)}
                  placeholder="Enter database name"
                  className={cn(
                    "mt-2",
                    newDatabaseName.trim().length > 0 &&
                      !IDENTIFIER_PATTERN.test(newDatabaseName.trim()) &&
                      "border-destructive"
                  )}
                />
                {newDatabaseName.trim().length > 0 &&
                  !IDENTIFIER_PATTERN.test(newDatabaseName.trim()) && (
                    <p className="text-xs text-destructive mt-1">
                      Letters, digits, and underscores only (e.g. my_database)
                    </p>
                  )}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="What this database stores and what it is for"
                  className="mt-2"
                  rows={2}
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
                <Button
                  type="submit"
                  disabled={
                    newDatabaseName.trim().length === 0 ||
                    !IDENTIFIER_PATTERN.test(newDatabaseName.trim())
                  }
                >
                  Create Database
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {editDialog}
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
