import type { Invitation } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Clock from "lucide-react/icons/clock";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import X from "lucide-react/icons/x";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createInvitation,
  deleteInvitation,
  removeMembership,
  updateMembership,
  useInvitations,
  useMemberships,
} from "@/services/organizations-service";

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "owner":
      return "default" as const;
    case "admin":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const invitationColumns: ColumnDef<Invitation>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {row.original.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.original.email}</div>
          </div>
        </div>
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
      const now = new Date();
      const isExpired = date < now;
      return (
        <div className={isExpired ? "text-red-500" : ""}>
          {format(date, "MMM d, yyyy")}
        </div>
      );
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
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("cancelInvitationTrigger", {
                  detail: {
                    invitationId: invitation.id,
                    email: invitation.email,
                  },
                })
              )
            }
            title="Cancel invitation"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
          </Button>
        </div>
      );
    },
  },
];

const columns: ColumnDef<{
  userId: string;
  organizationId: string;
  role: "member" | "admin" | "owner";
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}>[] = [
  {
    accessorKey: "user",
    header: "Member",
    cell: ({ row }) => {
      const user = row.getValue("user") as {
        id: string;
        name: string;
        email?: string;
        avatarUrl?: string;
      };
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            {user.email && (
              <div className="text-sm text-muted-foreground">{user.email}</div>
            )}
          </div>
        </div>
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
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return <div>{format(date, "MMM d, yyyy")}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const membership = row.original;
      const isOwner = membership.role === "owner";

      // Don't show dropdown for owners since they have no available actions
      if (isOwner) {
        return <div></div>;
      }

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
                    new CustomEvent("updateMemberRoleTrigger", {
                      detail: {
                        userId: membership.userId,
                        userName: membership.user.name,
                        userEmail: membership.user.email || "",
                        currentRole: membership.role,
                      },
                    })
                  )
                }
              >
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("removeMemberTrigger", {
                      detail: {
                        userId: membership.userId,
                        userName: membership.user.name,
                        userEmail: membership.user.email || "",
                      },
                    })
                  )
                }
                className="text-red-600 focus:text-red-600"
              >
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function MembersPage() {
  const { handle } = useParams<{ handle: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const {
    memberships,
    membershipsError,
    isMembershipsLoading,
    mutateMemberships,
  } = useMemberships(handle || "");

  const { invitations, mutateInvitations } = useInvitations(handle || "");

  const [isInviteMemberDialogOpen, setIsInviteMemberDialogOpen] =
    useState(false);
  const [isUpdateRoleDialogOpen, setIsUpdateRoleDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] =
    useState(false);
  const [isCancelInvitationDialogOpen, setIsCancelInvitationDialogOpen] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Invite member state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"member" | "admin">(
    "member"
  );

  // Update role state
  const [memberToUpdate, setMemberToUpdate] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
    currentRole: string;
  } | null>(null);
  const [newRole, setNewRole] = useState<"member" | "admin">("member");

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  // Cancel invitation state
  const [invitationToCancel, setInvitationToCancel] = useState<{
    invitationId: string;
    email: string;
  } | null>(null);

  const handleInviteMember = useCallback(async (): Promise<void> => {
    if (!newMemberEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    setIsProcessing(true);
    try {
      await createInvitation(handle || "", {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });

      toast.success("Invitation sent successfully");
      setIsInviteMemberDialogOpen(false);
      setNewMemberEmail("");
      setNewMemberRole("member");
      await mutateInvitations();
    } catch (error) {
      toast.error("Failed to send invitation. Please try again.");
      console.error("Send Invitation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [newMemberEmail, newMemberRole, handle, mutateInvitations]);

  const handleUpdateRole = useCallback(async (): Promise<void> => {
    if (!memberToUpdate) return;

    setIsProcessing(true);
    try {
      await updateMembership(handle || "", {
        email: memberToUpdate.userEmail,
        role: newRole,
      });

      toast.success("Member role updated successfully");
      setIsUpdateRoleDialogOpen(false);
      setMemberToUpdate(null);
      setNewRole("member");
      await mutateMemberships();
    } catch (error) {
      toast.error("Failed to update member role. Please try again.");
      console.error("Update Role Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [memberToUpdate, newRole, handle, mutateMemberships]);

  const handleRemoveMember = useCallback(async (): Promise<void> => {
    if (!memberToRemove) return;

    setIsProcessing(true);
    try {
      await removeMembership(handle || "", {
        email: memberToRemove.userEmail,
      });

      toast.success("Member removed successfully");
      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
      await mutateMemberships();
    } catch (error) {
      toast.error("Failed to remove member. Please try again.");
      console.error("Remove Member Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [memberToRemove, handle, mutateMemberships]);

  const handleCancelInvitation = useCallback(async (): Promise<void> => {
    if (!invitationToCancel) return;

    setIsProcessing(true);
    try {
      await deleteInvitation(handle || "", invitationToCancel.invitationId);

      toast.success("Invitation cancelled");
      setIsCancelInvitationDialogOpen(false);
      setInvitationToCancel(null);
      await mutateInvitations();
    } catch (error) {
      toast.error("Failed to cancel invitation. Please try again.");
      console.error("Cancel Invitation Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [invitationToCancel, handle, mutateInvitations]);

  // Handle events from the table
  const handleUpdateRoleEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{
      userId: string;
      userName: string;
      userEmail: string;
      currentRole: string;
    }>;
    if (custom.detail) {
      setMemberToUpdate(custom.detail);
      setNewRole(custom.detail.currentRole as "member" | "admin");
      setIsUpdateRoleDialogOpen(true);
    }
  }, []);

  const handleRemoveMemberEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{
      userId: string;
      userName: string;
      userEmail: string;
    }>;
    if (custom.detail) {
      setMemberToRemove(custom.detail);
      setIsRemoveMemberDialogOpen(true);
    }
  }, []);

  const handleCancelInvitationEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<{
      invitationId: string;
      email: string;
    }>;
    if (custom.detail) {
      setInvitationToCancel(custom.detail);
      setIsCancelInvitationDialogOpen(true);
    }
  }, []);

  // Add event listeners
  useEffect(() => {
    document.addEventListener("updateMemberRoleTrigger", handleUpdateRoleEvent);
    document.addEventListener("removeMemberTrigger", handleRemoveMemberEvent);
    document.addEventListener(
      "cancelInvitationTrigger",
      handleCancelInvitationEvent
    );

    return () => {
      document.removeEventListener(
        "updateMemberRoleTrigger",
        handleUpdateRoleEvent
      );
      document.removeEventListener(
        "removeMemberTrigger",
        handleRemoveMemberEvent
      );
      document.removeEventListener(
        "cancelInvitationTrigger",
        handleCancelInvitationEvent
      );
    };
  }, [
    handleUpdateRoleEvent,
    handleRemoveMemberEvent,
    handleCancelInvitationEvent,
  ]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Members" }]);
  }, [setBreadcrumbs]);

  if (isMembershipsLoading && !memberships) {
    return <InsetLoading title="Organization Members" />;
  } else if (membershipsError) {
    return (
      <InsetError
        title="Organization Members"
        errorMessage={membershipsError.message}
      />
    );
  }

  return (
    <InsetLayout title="Members">
      <div className="flex items-center justify-between mb-6 min-h-10">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Manage organization members and invitations.
        </div>
        <Button onClick={() => setIsInviteMemberDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">
            Members ({memberships?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Clock className="mr-2 h-4 w-4" />
            Invitations ({invitations?.length || 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4">
          <DataTable
            columns={columns}
            data={memberships || []}
            emptyState={{
              title: "No members found",
              description:
                "Invite members to your organization to get started.",
            }}
          />
        </TabsContent>
        <TabsContent value="invitations" className="mt-4">
          <DataTable
            columns={invitationColumns}
            data={invitations || []}
            emptyState={{
              title: "No pending invitations",
              description:
                "Invitations you send will appear here until they are accepted or expire.",
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <AlertDialog
        open={isInviteMemberDialogOpen}
        onOpenChange={setIsInviteMemberDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invite New Member</AlertDialogTitle>
            <AlertDialogDescription>
              Send an invitation to join your organization. The recipient will
              need to accept the invitation to become a member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="Enter email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newMemberRole}
                onValueChange={(value: "member" | "admin") =>
                  setNewMemberRole(value)
                }
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setNewMemberEmail("");
                setNewMemberRole("member");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInviteMember}
              disabled={isProcessing || !newMemberEmail.trim()}
            >
              {isProcessing ? "Sending..." : "Send Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Role Dialog */}
      <AlertDialog
        open={isUpdateRoleDialogOpen}
        onOpenChange={setIsUpdateRoleDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Member Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change the role for <strong>{memberToUpdate?.userName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">New Role</Label>
              <Select
                value={newRole}
                onValueChange={(value: "member" | "admin") => setNewRole(value)}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToUpdate(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateRole}
              disabled={isProcessing}
            >
              {isProcessing ? "Updating..." : "Update Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={isRemoveMemberDialogOpen}
        onOpenChange={setIsRemoveMemberDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.userName}</strong> from this
              organization? They will lose access to all organization resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action will immediately revoke the member's access to the
              organization.
            </AlertDescription>
          </Alert>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog
        open={isCancelInvitationDialogOpen}
        onOpenChange={setIsCancelInvitationDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{" "}
              <strong>{invitationToCancel?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvitationToCancel(null)}>
              Keep Invitation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Cancelling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
