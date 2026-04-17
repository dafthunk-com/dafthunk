import type { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
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
import {
  deleteEmail,
  updateEmail,
  useEmails,
} from "@/services/email-service";

const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || "mail.dafthunk.com";

interface EmailRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function downloadVCard(email: EmailRow) {
  const rawName = email.name || "Untitled Email";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const emailAddress = `${email.id}@${EMAIL_DOMAIN}`;
  const fullName = `Dafthunk (${displayName})`;
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
    `N:Dafthunk;${displayName};;;`,
    `EMAIL:${emailAddress}`,
    `ORG:Dafthunk`,
    "END:VCARD",
  ].join("\r\n");

  const blob = new Blob([vcard], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${displayName}.vcf`;
  link.click();
  URL.revokeObjectURL(url);
}

function createColumns(
  openEditDialog: (email: EmailRow) => void,
  openDeleteDialog: (email: EmailRow) => void
): ColumnDef<EmailRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name || "Untitled Email"}</span>;
      },
    },
    {
      id: "emailAddress",
      header: "Email",
      cell: ({ row }) => {
        const email = row.original;
        const emailAddress = `${email.id}@${EMAIL_DOMAIN}`;
        return (
          <a
            href={`mailto:${emailAddress}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {emailAddress}
          </a>
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
                <DropdownMenuItem onClick={() => downloadVCard(email)}>
                  Save to Address Book
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(email)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(email)}>
                  Delete
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
  const orgId = organization?.id || "";

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
    if (!emailToDelete || !orgId) return;
    setIsDeleting(true);
    try {
      await deleteEmail(emailToDelete.id, orgId);
      setDeleteDialogOpen(false);
      setEmailToDelete(null);
      mutateEmails();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditEmail = async () => {
    if (!emailToEdit || !orgId || editName.trim() === "") return;
    setIsEditing(true);
    try {
      await updateEmail(emailToEdit.id, { name: editName.trim() }, orgId);
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

  const columns = createColumns(openEditDialog, openDeleteDialog);

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
            Create and manage emails for sending and receiving in your
            workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Email
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={(emails as EmailRow[]) || []}
          emptyState={{
            title: "No emails found",
            description: "Create a new email to get started.",
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
              <DialogTitle>Edit Email</DialogTitle>
              <DialogDescription>Rename your email.</DialogDescription>
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
