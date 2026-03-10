import type { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Pencil from "lucide-react/icons/pencil";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";

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
import { EmailCreateDialog } from "@/components/workflow/widgets/input/email-create-dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { deleteEmail, updateEmail, useEmails } from "@/services/email-service";

interface EmailRow {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

function createColumns(
  openEditDialog: (email: EmailRow) => void,
  openDeleteDialog: (email: EmailRow) => void,
  orgHandle: string
): ColumnDef<EmailRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Email Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "Untitled Email"}</span>;
      },
    },
    {
      accessorKey: "handle",
      header: "Email Handle",
      cell: ({ row }) => {
        const handle = row.original.handle;
        return <span className="text-sm text-muted-foreground">{handle}</span>;
      },
    },
    {
      id: "emailAddress",
      header: "Email Address",
      cell: ({ row }) => {
        const email = row.original;
        const emailAddress = `${orgHandle}+${email.handle}@dafthunk.com`;
        return (
          <span className="text-sm text-muted-foreground">{emailAddress}</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const email = row.original;
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
                <DropdownMenuItem onClick={() => openEditDialog(email)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(email)}>
                  Delete Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function EmailsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<EmailRow | null>(null);
  const [emailToEdit, setEmailToEdit] = useState<EmailRow | null>(null);
  const [editName, setEditName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { emails, emailsError, isEmailsLoading, mutateEmails } = useEmails();

  useEffect(() => {
    setBreadcrumbs([{ label: "Emails" }]);
  }, [setBreadcrumbs]);

  const openDeleteDialog = (email: EmailRow) => {
    setEmailToDelete(email);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (email: EmailRow) => {
    setEmailToEdit(email);
    setEditName(email.name);
    setEditDialogOpen(true);
  };

  const handleDeleteEmail = async () => {
    if (!emailToDelete || !orgHandle) return;
    setIsDeleting(true);
    try {
      await deleteEmail(emailToDelete.id, orgHandle);
      setDeleteDialogOpen(false);
      setEmailToDelete(null);
      mutateEmails();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditEmail = async () => {
    if (!emailToEdit || !orgHandle || editName.trim() === "") return;
    setIsEditing(true);
    try {
      await updateEmail(emailToEdit.id, { name: editName.trim() }, orgHandle);
      setEditDialogOpen(false);
      setEmailToEdit(null);
      mutateEmails();
    } finally {
      setIsEditing(false);
    }
  };

  const handleCreated = () => {
    mutateEmails();
    setIsCreateDialogOpen(false);
  };

  const columns = createColumns(openEditDialog, openDeleteDialog, orgHandle);

  if (isEmailsLoading) {
    return <InsetLoading title="Emails" />;
  } else if (emailsError) {
    return <InsetError title="Emails" errorMessage={emailsError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Emails">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage email inboxes for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Inbox
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={(emails as EmailRow[]) || []}
          emptyState={{
            title: "No email inboxes found",
            description: "Create a new email inbox to get started.",
          }}
        />
        <EmailCreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={handleCreated}
        />
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Email Inbox</DialogTitle>
              <DialogDescription>Rename your email inbox.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="edit-email-name">Name</Label>
              <Input
                id="edit-email-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
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
                onClick={handleEditEmail}
                disabled={isEditing || editName.trim() === ""}
              >
                {isEditing ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Email</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "
                {emailToDelete?.name || "Untitled Email"}"? This action cannot
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
                onClick={handleDeleteEmail}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </InsetLayout>
    </TooltipProvider>
  );
}
