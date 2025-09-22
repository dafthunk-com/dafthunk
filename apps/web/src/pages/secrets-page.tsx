import { Secret } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createSecret,
  deleteSecret,
  updateSecret,
  useSecrets,
} from "@/services/secrets-service";

const columns: ColumnDef<Secret>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as Date;
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const secret = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("editSecretTrigger", {
                      detail: secret,
                    })
                  )
                }
              >
                Edit Secret
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("deleteSecretTrigger", {
                      detail: secret.id,
                    })
                  )
                }
              >
                Delete Secret
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function SecretsPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { secrets, secretsError, isSecretsLoading, mutateSecrets } =
    useSecrets();
  const { organization } = useAuth();

  const [secretToDelete, setSecretToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [editSecretName, setEditSecretName] = useState("");
  const [editSecretValue, setEditSecretValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Secrets" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setSecretToDelete(custom.detail);
        setIsDeleteDialogOpen(true);
      }
    };

    const handleEditEvent = (e: Event) => {
      const custom = e as CustomEvent<Secret>;
      if (custom.detail) {
        setEditingSecret(custom.detail);
        setEditSecretName(custom.detail.name);
        setEditSecretValue(""); // Don't pre-fill the value for security
        setIsEditDialogOpen(true);
      }
    };

    document.addEventListener("deleteSecretTrigger", handleDeleteEvent);
    document.addEventListener("editSecretTrigger", handleEditEvent);

    return () => {
      document.removeEventListener("deleteSecretTrigger", handleDeleteEvent);
      document.removeEventListener("editSecretTrigger", handleEditEvent);
    };
  }, [organization?.handle]);

  const handleDeleteSecret = useCallback(async (): Promise<void> => {
    if (!secretToDelete || !organization?.handle) return;
    setIsProcessing(true);
    try {
      await deleteSecret(secretToDelete, organization.handle);
      toast.success("Secret deleted successfully");
      await mutateSecrets();
    } catch (error) {
      toast.error("Failed to delete secret. Please try again.");
      console.error("Delete Secret Error:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSecretToDelete(null);
      setIsProcessing(false);
    }
  }, [secretToDelete, organization?.handle, mutateSecrets]);

  const handleCreateSecret = useCallback(async (): Promise<void> => {
    if (
      !newSecretName.trim() ||
      !newSecretValue.trim() ||
      !organization?.handle
    ) {
      toast.error("Secret name and value are required");
      return;
    }
    setIsProcessing(true);
    try {
      await createSecret(
        newSecretName.trim(),
        newSecretValue.trim(),
        organization.handle
      );
      setIsCreateDialogOpen(false);
      setNewSecretName("");
      setNewSecretValue("");
      toast.success("Secret created successfully");
      await mutateSecrets();
    } catch (error) {
      toast.error("Failed to create secret. Please try again.");
      console.error("Create Secret Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [newSecretName, newSecretValue, organization?.handle, mutateSecrets]);

  const handleUpdateSecret = useCallback(async (): Promise<void> => {
    if (!editingSecret || !organization?.handle) return;

    const updates: { name?: string; value?: string } = {};
    if (editSecretName.trim() !== editingSecret.name) {
      updates.name = editSecretName.trim();
    }
    if (editSecretValue.trim()) {
      updates.value = editSecretValue.trim();
    }

    if (Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    setIsProcessing(true);
    try {
      await updateSecret(editingSecret.id, updates, organization.handle);
      setIsEditDialogOpen(false);
      setEditingSecret(null);
      setEditSecretName("");
      setEditSecretValue("");
      toast.success("Secret updated successfully");
      await mutateSecrets();
    } catch (error) {
      toast.error("Failed to update secret. Please try again.");
      console.error("Update Secret Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    editingSecret,
    editSecretName,
    editSecretValue,
    organization?.handle,
    mutateSecrets,
  ]);

  if (isSecretsLoading && !secrets) {
    return <InsetLoading title="Secrets" />;
  } else if (secretsError) {
    return <InsetError title="Secrets" errorMessage={secretsError.message} />;
  }

  return (
    <InsetLayout title="Secrets">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Store and manage encrypted secrets for your organization. These can be
          used in workflows and accessed via API.
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus /> Create Secret
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={secrets || []}
        emptyState={{
          title: "No secrets found",
          description: "Create your first secret to get started.",
        }}
      />

      {/* Create Secret Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Secret</DialogTitle>
            <DialogDescription>
              Add a new encrypted secret to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="secret-name">Name</Label>
              <Input
                id="secret-name"
                placeholder="Secret name"
                value={newSecretName}
                onChange={(e) => setNewSecretName(e.target.value)}
                disabled={isProcessing}
                maxLength={64}
              />
            </div>
            <div>
              <Label htmlFor="secret-value">Value</Label>
              <Textarea
                id="secret-value"
                placeholder="Secret value"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                disabled={isProcessing}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewSecretName("");
                setNewSecretValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSecret}
              disabled={
                isProcessing || !newSecretName.trim() || !newSecretValue.trim()
              }
            >
              {isProcessing ? "Creating..." : "Create Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Secret Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update the name or value of this secret.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-secret-name">Name</Label>
              <Input
                id="edit-secret-name"
                placeholder="Secret name"
                value={editSecretName}
                onChange={(e) => setEditSecretName(e.target.value)}
                disabled={isProcessing}
                maxLength={64}
              />
            </div>
            <div>
              <Label htmlFor="edit-secret-value">
                Value (leave empty to keep current value)
              </Label>
              <Textarea
                id="edit-secret-value"
                placeholder="New secret value"
                value={editSecretValue}
                onChange={(e) => setEditSecretValue(e.target.value)}
                disabled={isProcessing}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingSecret(null);
                setEditSecretName("");
                setEditSecretValue("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateSecret} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Secret Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              secret and any workflows using it may fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSecretToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSecret}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
