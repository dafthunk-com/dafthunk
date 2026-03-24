import type { Field, SchemaEntity } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { SchemaDialog } from "@/components/schema-dialog";
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
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createSchema,
  deleteSchema,
  updateSchema,
  useSchemas,
} from "@/services/schema-service";

function useSchemaActions() {
  const { mutateSchemas } = useSchemas();
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [schemaToDelete, setSchemaToDelete] = useState<SchemaEntity | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!schemaToDelete || !orgId) return;
    setIsDeleting(true);
    try {
      await deleteSchema(schemaToDelete.id, orgId);
      setDeleteDialogOpen(false);
      setSchemaToDelete(null);
      mutateSchemas();
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Schema</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{schemaToDelete?.name}"? This
            action cannot be undone.
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
            onClick={handleDelete}
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
    openDeleteDialog: (schema: SchemaEntity) => {
      setSchemaToDelete(schema);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (schema: SchemaEntity) => void,
  openEditDialog: (schema: SchemaEntity) => void
): ColumnDef<SchemaEntity>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-xs block">
          {row.getValue("description") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "fields",
      header: "Fields",
      cell: ({ row }) => {
        const fields = row.getValue("fields") as Field[];
        return <span className="text-muted-foreground">{fields.length}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const schema = row.original;
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
                <DropdownMenuItem onClick={() => openEditDialog(schema)}>
                  Edit Schema
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(schema)}>
                  Delete Schema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function SchemasPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editSchema, setEditSchema] = useState<SchemaEntity | null>(null);
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const { schemas, schemasError, isSchemasLoading, mutateSchemas } =
    useSchemas();

  const { deleteDialog, openDeleteDialog } = useSchemaActions();

  const columns = createColumns(openDeleteDialog, (schema) =>
    setEditSchema(schema)
  );

  useEffect(() => {
    setBreadcrumbs([{ label: "Schemas" }]);
  }, [setBreadcrumbs]);

  const handleCreate = async (data: {
    name: string;
    description: string;
    fields: Field[];
  }) => {
    if (!orgId) return;
    await createSchema(data, orgId);
    mutateSchemas();
  };

  const handleEdit = async (data: {
    name: string;
    description: string;
    fields: Field[];
  }) => {
    if (!orgId || !editSchema) return;
    await updateSchema(editSchema.id, data, orgId);
    mutateSchemas();
  };

  if (isSchemasLoading) {
    return <InsetLoading title="Schemas" />;
  } else if (schemasError) {
    return <InsetError title="Schemas" errorMessage={schemasError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Schemas">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Define reusable schemas to validate and enforce record shapes across
            your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Schema
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={schemas || []}
          emptyState={{
            title: "No schemas found",
            description: "Create a new schema to get started.",
          }}
        />
        <SchemaDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreate}
          title="Create New Schema"
          submitLabel="Create Schema"
        />
        <SchemaDialog
          open={editSchema !== null}
          onOpenChange={(open) => {
            if (!open) setEditSchema(null);
          }}
          schema={editSchema}
          onSubmit={handleEdit}
          title="Edit Schema"
          submitLabel="Save Changes"
        />
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
