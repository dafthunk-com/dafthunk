import { ColumnDef } from "@tanstack/react-table";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Plus from "lucide-react/icons/plus";
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
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { createEmail, deleteEmail, useEmails } from "@/services/email-service";

function useEmailActions() {
  const { mutateEmails } = useEmails();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Email</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {emailToDelete?.name || "Untitled Email"}"? This action cannot be
            undone.
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
  );

  return {
    deleteDialog,
    openDeleteDialog: (email: any) => {
      setEmailToDelete(email);
      setDeleteDialogOpen(true);
    },
  };
}

function createColumns(
  openDeleteDialog: (email: any) => void,
  orgHandle: string
): ColumnDef<any>[] {
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
      id: "prodEmailAddress",
      header: "Production Email",
      cell: ({ row }) => {
        const email = row.original;
        const emailAddress = `${orgHandle}+${email.handle}@dafthunk.com`;
        return (
          <span className="text-sm text-muted-foreground">{emailAddress}</span>
        );
      },
    },
    {
      id: "devEmailAddress",
      header: "Development Email",
      cell: ({ row }) => {
        const email = row.original;
        const emailAddress = `${orgHandle}+${email.handle}+dev@dafthunk.com`;
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
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { emails, emailsError, isEmailsLoading, mutateEmails } = useEmails();

  const { deleteDialog, openDeleteDialog } = useEmailActions();

  const columns = createColumns(openDeleteDialog, orgHandle);

  useEffect(() => {
    setBreadcrumbs([{ label: "Emails" }]);
  }, [setBreadcrumbs]);

  const handleCreateEmail = async (name: string) => {
    if (!orgHandle) return;

    try {
      await createEmail({ name }, orgHandle);
      mutateEmails();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create email:", error);
    }
  };

  if (isEmailsLoading) {
    return <InsetLoading title="Emails" />;
  } else if (emailsError) {
    return <InsetError title="Emails" errorMessage={emailsError.message} />;
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Emails">
        <div className="flex items-center justify-between mb-6  min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Create and manage email inboxes for your workflows.
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Email Inbox
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={emails || []}
          emptyState={{
            title: "No email inboxes found",
            description: "Create a new email inbox to get started.",
          }}
        />
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Email Inbox</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                await handleCreateEmail(name);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Email Inbox Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter email inbox name"
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
                <Button type="submit">Create Email Inbox</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
