import type { SenderEmailStatus } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import CircleCheck from "lucide-react/icons/circle-check";
import Clock from "lucide-react/icons/clock";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import RefreshCw from "lucide-react/icons/refresh-cw";
import TriangleAlert from "lucide-react/icons/triangle-alert";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
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
  deleteSenderEmail,
  setSenderEmail,
  updateEmail,
  useEmails,
  verifySenderEmail,
} from "@/services/email-service";

const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || "dafthunk.com";

interface EmailRow {
  id: string;
  name: string;
  senderEmail: string | null;
  senderEmailStatus: SenderEmailStatus | null;
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

function StatusBadge({ status }: { status: SenderEmailStatus | null }) {
  switch (status) {
    case "verified":
      return (
        <Badge variant="translucent-success" className="gap-1">
          <CircleCheck className="size-3" />
          Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="translucent-warning" className="gap-1">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="translucent-error">
          <TriangleAlert className="size-3" />
          Failed
        </Badge>
      );
    default:
      return <span className="text-sm text-muted-foreground">Not set</span>;
  }
}

function createColumns(
  openEditDialog: (email: EmailRow) => void,
  openDeleteDialog: (email: EmailRow) => void,
  openSenderEmailDialog: (email: EmailRow) => void,
  handleCheckSenderStatus: (email: EmailRow) => void,
  handleRemoveSenderEmail: (email: EmailRow) => void
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
      id: "senderEmail",
      header: "Sender Email",
      cell: ({ row }) => {
        const email = row.original;
        if (!email.senderEmail) {
          return <span className="text-sm text-muted-foreground">Not set</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">{email.senderEmail}</span>
            <StatusBadge status={email.senderEmailStatus} />
          </div>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openSenderEmailDialog(email)}>
                  {email.senderEmail
                    ? "Change Sender Email"
                    : "Set Sender Email"}
                </DropdownMenuItem>
                {email.senderEmail &&
                  email.senderEmailStatus !== "verified" && (
                    <DropdownMenuItem
                      onClick={() => handleCheckSenderStatus(email)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Check Verification Status
                    </DropdownMenuItem>
                  )}
                {email.senderEmail && (
                  <DropdownMenuItem
                    onClick={() => handleRemoveSenderEmail(email)}
                  >
                    Remove Sender Email
                  </DropdownMenuItem>
                )}
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
  const [senderEmailDialogOpen, setSenderEmailDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<EmailRow | null>(null);
  const [emailToEdit, setEmailToEdit] = useState<EmailRow | null>(null);
  const [emailForSender, setEmailForSender] = useState<EmailRow | null>(null);
  const [editName, setEditName] = useState("");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingSender, setIsSavingSender] = useState(false);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const { emails, emailsError, isEmailsLoading, mutateEmails } = useEmails();

  useEffect(() => {
    setBreadcrumbs([{ label: "Emails" }]);
  }, [setBreadcrumbs]);

  // Poll SES verification status for pending sender emails
  const pendingIds =
    emails
      ?.filter((e) => e.senderEmail && e.senderEmailStatus === "pending")
      .map((e) => e.id) ?? [];
  const hasPending = pendingIds.length > 0;
  const pendingIdsRef = useRef(pendingIds);
  pendingIdsRef.current = pendingIds;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(async () => {
      const ids = pendingIdsRef.current;
      if (!ids.length) return;
      const results = await Promise.allSettled(
        ids.map((id) => verifySenderEmail(id, orgIdRef.current))
      );
      const hasChange = results.some(
        (r) =>
          r.status === "fulfilled" && r.value.senderEmailStatus !== "pending"
      );
      if (hasChange) {
        mutateEmails();
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [hasPending, mutateEmails]);

  const openDeleteDialog = (email: EmailRow) => {
    setEmailToDelete(email);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (email: EmailRow) => {
    setEmailToEdit(email);
    setEditName(email.name);
    setEditDialogOpen(true);
  };

  const openSenderEmailDialog = (email: EmailRow) => {
    setEmailForSender(email);
    setSenderEmailInput(email.senderEmail || "");
    setSenderEmailDialogOpen(true);
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

  const handleSetSenderEmail = async () => {
    if (!emailForSender || !orgId || !senderEmailInput.trim()) return;
    setIsSavingSender(true);
    try {
      await setSenderEmail(emailForSender.id, senderEmailInput.trim(), orgId);
      setSenderEmailDialogOpen(false);
      setEmailForSender(null);
      mutateEmails();
      toast.success(
        "Verification email sent by Amazon SES. Check your inbox (and spam folder) for an email from Amazon Web Services and click the verification link."
      );
    } catch {
      toast.error("Failed to set sender email.");
    } finally {
      setIsSavingSender(false);
    }
  };

  const handleCheckSenderStatus = async (email: EmailRow) => {
    if (!orgId) return;
    try {
      const result = await verifySenderEmail(email.id, orgId);
      mutateEmails();
      if (result.senderEmailStatus === "verified") {
        toast.success(`Sender email verified for "${email.name}".`);
      } else if (result.senderEmailStatus === "failed") {
        toast.error(
          "Verification failed. The link may have expired — try setting the sender email again to receive a new verification email."
        );
      } else {
        toast.info(
          "Still pending. Look for an email from Amazon Web Services and click the verification link. Check your spam folder if you don't see it."
        );
      }
    } catch {
      toast.error("Failed to check verification status.");
    }
  };

  const handleRemoveSenderEmail = async (email: EmailRow) => {
    if (!orgId) return;
    try {
      await deleteSenderEmail(email.id, orgId);
      mutateEmails();
      toast.success(`Sender email removed from "${email.name}".`);
    } catch {
      toast.error("Failed to remove sender email.");
    }
  };

  const handleCreated = () => {
    mutateEmails();
    setIsCreateDialogOpen(false);
  };

  const columns = createColumns(
    openEditDialog,
    openDeleteDialog,
    openSenderEmailDialog,
    handleCheckSenderStatus,
    handleRemoveSenderEmail
  );

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
        <Dialog
          open={senderEmailDialogOpen}
          onOpenChange={setSenderEmailDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Sender Email</DialogTitle>
              <DialogDescription>
                Set a custom sender address for workflows using the "
                {emailForSender?.name || "this email"}" email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sender-email-input">Sender Email Address</Label>
                <Input
                  id="sender-email-input"
                  type="email"
                  placeholder="notifications@yourcompany.com"
                  value={senderEmailInput}
                  onChange={(e) => setSenderEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSetSenderEmail();
                  }}
                />
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
                <p>
                  Amazon SES will send a verification email to this address.
                  Click the link in that email to confirm ownership.
                </p>
                <p>
                  The verification email comes from Amazon Web Services — check
                  your spam folder if you don't see it within a few minutes.
                </p>
                <p>
                  To trigger workflows from replies, set up forwarding from this
                  address to{" "}
                  <span className="font-mono text-foreground">
                    {emailForSender?.id}@{EMAIL_DOMAIN}
                  </span>
                  .
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSenderEmailDialogOpen(false)}
                disabled={isSavingSender}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetSenderEmail}
                disabled={isSavingSender || !senderEmailInput.trim()}
              >
                {isSavingSender ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </InsetLayout>
    </TooltipProvider>
  );
}
