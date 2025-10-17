import {
  Integration,
  IntegrationProvider,
  OAUTH_PROVIDERS,
} from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Plus from "lucide-react/icons/plus";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { getApiBaseUrl } from "@/config/api";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  deleteIntegration,
  useIntegrations,
} from "@/services/integrations-service";

const providerLabels: Record<IntegrationProvider, string> = {
  "google-mail": "Google Mail",
  "google-calendar": "Google Calendar",
  discord: "Discord",
  openai: "OpenAI",
};

const columns: ColumnDef<Integration>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => {
      const provider = row.getValue("provider") as IntegrationProvider;
      return <div>{providerLabels[provider]}</div>;
    },
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
    id: "actions",
    cell: ({ row }) => {
      const integration = row.original;
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
                    new CustomEvent("deleteIntegrationTrigger", {
                      detail: integration.id,
                    })
                  )
                }
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function IntegrationsPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const {
    integrations,
    integrationsError,
    isIntegrationsLoading,
    mutateIntegrations,
  } = useIntegrations();
  const { organization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIntegrationProvider, setNewIntegrationProvider] =
    useState<IntegrationProvider>("google-mail");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Integrations" }]);
  }, [setBreadcrumbs]);

  // Handle OAuth callback success/error
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "google_mail_connected") {
      toast.success("Google Mail integration connected successfully");
      mutateIntegrations();
      setSearchParams({});
    } else if (success === "google_calendar_connected") {
      toast.success("Google Calendar integration connected successfully");
      mutateIntegrations();
      setSearchParams({});
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "OAuth authentication failed",
        invalid_state: "Invalid OAuth state",
        expired_state: "OAuth session expired",
        not_authenticated: "Please log in first",
        organization_mismatch: "Organization mismatch",
      };
      toast.error(errorMessages[error] || "Failed to connect integration");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, mutateIntegrations]);

  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setIntegrationToDelete(custom.detail);
        setIsDeleteDialogOpen(true);
      }
    };

    document.addEventListener("deleteIntegrationTrigger", handleDeleteEvent);

    return () => {
      document.removeEventListener(
        "deleteIntegrationTrigger",
        handleDeleteEvent
      );
    };
  }, [organization?.handle]);

  const handleOAuthConnect = useCallback((provider: IntegrationProvider) => {
    const oauthProvider = OAUTH_PROVIDERS.find((p) => p.id === provider);
    if (!oauthProvider?.oauthEndpoint) {
      toast.error("OAuth not supported for this provider");
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    window.location.href = `${apiBaseUrl}${oauthProvider.oauthEndpoint}`;
  }, []);

  const handleDeleteIntegration = useCallback(async (): Promise<void> => {
    if (!integrationToDelete || !organization?.handle) return;
    setIsProcessing(true);
    try {
      await deleteIntegration(integrationToDelete, organization.handle);
      toast.success("Integration deleted successfully");
      await mutateIntegrations();
    } catch (error) {
      toast.error("Failed to delete integration. Please try again.");
      console.error("Delete Integration Error:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setIntegrationToDelete(null);
      setIsProcessing(false);
    }
  }, [integrationToDelete, organization?.handle, mutateIntegrations]);


  if (isIntegrationsLoading && !integrations) {
    return <InsetLoading title="Integrations" />;
  } else if (integrationsError) {
    return (
      <InsetError title="Integrations" errorMessage={integrationsError.message} />
    );
  }

  return (
    <InsetLayout title="Integrations">
      <div className="flex items-center justify-between mb-6 min-h-10">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Connect third-party services to use in your workflows.
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={integrations || []}
        emptyState={{
          title: "No integrations found",
          description: "Create your first integration to get started.",
        }}
      />

      {/* Create Integration Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>
              Connect a third-party service to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Select
                value={newIntegrationProvider}
                onValueChange={(value) =>
                  setNewIntegrationProvider(value as IntegrationProvider)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OAUTH_PROVIDERS.map((provider) => (
                    <SelectItem
                      key={provider.id}
                      value={provider.id}
                      disabled={!provider.supportsOAuth}
                    >
                      {provider.name}
                      {!provider.supportsOAuth && " (Coming Soon)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {OAUTH_PROVIDERS.find((p) => p.id === newIntegrationProvider)
                  ?.description}
              </p>
            </div>

            {OAUTH_PROVIDERS.find((p) => p.id === newIntegrationProvider)
              ?.supportsOAuth ? (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Secure OAuth Connection</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to securely connect your account. You'll
                  be redirected to authorize access.
                </p>
                <Button
                  onClick={() => {
                    handleOAuthConnect(newIntegrationProvider);
                    setIsCreateDialogOpen(false);
                  }}
                  className="w-full"
                >
                  Connect with{" "}
                  {
                    OAUTH_PROVIDERS.find((p) => p.id === newIntegrationProvider)
                      ?.name
                  }
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm text-muted-foreground text-center">
                  This integration is not available yet. Check back soon!
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewIntegrationProvider("google-mail");
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Integration Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this integration from your organization. Workflows
              using this integration may fail until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIntegrationToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIntegration}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
