import type { UserInvitation } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Check from "lucide-react/icons/check";
import X from "lucide-react/icons/x";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  acceptInvitation,
  declineInvitation,
  useOrganizations,
  useUserInvitations,
} from "@/services/organizations-service";

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "admin":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const invitationColumns: ColumnDef<UserInvitation>[] = [
  {
    accessorKey: "organization",
    header: "Organization",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.organization.name}</div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={getRoleBadgeVariant(role)}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expiresAt"));
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    accessorKey: "inviter",
    header: "Invited By",
    cell: ({ row }) => {
      const inviter = row.original.inviter;
      return (
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={inviter.avatarUrl} alt={inviter.name} />
            <AvatarFallback>
              {inviter.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{inviter.name}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invitation = row.original;
      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("acceptInvitationTrigger", {
                  detail: {
                    invitationId: invitation.id,
                    organizationName: invitation.organization.name,
                  },
                })
              )
            }
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("declineInvitationTrigger", {
                  detail: {
                    invitationId: invitation.id,
                    organizationName: invitation.organization.name,
                  },
                })
              )
            }
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
        </div>
      );
    },
  },
];

export function InvitationsPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { invitations, isInvitationsLoading, mutateInvitations } =
    useUserInvitations();
  const { mutateOrganizations } = useOrganizations();

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([{ label: "Invitations" }]);
  }, [setBreadcrumbs]);

  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    invitationId: string;
    organizationName: string;
  } | null>(null);

  const handleAcceptInvitation = useCallback(async (): Promise<void> => {
    if (!selectedInvitation) return;

    setIsProcessing(true);
    try {
      await acceptInvitation(selectedInvitation.invitationId);

      toast.success(`You have joined ${selectedInvitation.organizationName}!`);
      setIsAcceptDialogOpen(false);
      setSelectedInvitation(null);
      await mutateInvitations();
      await mutateOrganizations();
    } catch (error) {
      toast.error("Failed to accept invitation. Please try again.");
      console.error("Accept Invitation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedInvitation, mutateInvitations, mutateOrganizations]);

  const handleDeclineInvitation = useCallback(async (): Promise<void> => {
    if (!selectedInvitation) return;

    setIsProcessing(true);
    try {
      await declineInvitation(selectedInvitation.invitationId);

      toast.success("Invitation declined");
      setIsDeclineDialogOpen(false);
      setSelectedInvitation(null);
      await mutateInvitations();
    } catch (error) {
      toast.error("Failed to decline invitation. Please try again.");
      console.error("Decline Invitation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedInvitation, mutateInvitations]);

  // Handle events from the table
  const handleAcceptEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{
      invitationId: string;
      organizationName: string;
    }>;
    if (custom.detail) {
      setSelectedInvitation(custom.detail);
      setIsAcceptDialogOpen(true);
    }
  }, []);

  const handleDeclineEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{
      invitationId: string;
      organizationName: string;
    }>;
    if (custom.detail) {
      setSelectedInvitation(custom.detail);
      setIsDeclineDialogOpen(true);
    }
  }, []);

  // Add event listeners
  // Note: Using useEffect would cause re-renders, so we add listeners directly
  if (typeof document !== "undefined") {
    document.removeEventListener("acceptInvitationTrigger", handleAcceptEvent);
    document.removeEventListener(
      "declineInvitationTrigger",
      handleDeclineEvent
    );
    document.addEventListener("acceptInvitationTrigger", handleAcceptEvent);
    document.addEventListener("declineInvitationTrigger", handleDeclineEvent);
  }

  if (isInvitationsLoading && !invitations) {
    return <InsetLoading title="Invitations" />;
  }

  return (
    <InsetLayout title="Invitations">
      <div className="flex items-center justify-between mb-6 min-h-10">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Organization invitations that have been sent to you.
        </div>
      </div>

      <DataTable
        columns={invitationColumns}
        data={invitations || []}
        emptyState={{
          title: "No pending invitations",
          description:
            "When someone invites you to join an organization, it will appear here.",
        }}
      />

      {/* Accept Invitation Dialog */}
      <AlertDialog
        open={isAcceptDialogOpen}
        onOpenChange={setIsAcceptDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to join{" "}
              <strong>{selectedInvitation?.organizationName}</strong>. You will
              have access to the organization's resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitation(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptInvitation}
              disabled={isProcessing}
            >
              {isProcessing ? "Accepting..." : "Accept Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Invitation Dialog */}
      <AlertDialog
        open={isDeclineDialogOpen}
        onOpenChange={setIsDeclineDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline the invitation from{" "}
              <strong>{selectedInvitation?.organizationName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitation(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeclineInvitation}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Declining..." : "Decline Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
