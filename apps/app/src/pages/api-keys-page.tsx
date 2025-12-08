import { ApiKey } from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Copy from "lucide-react/icons/copy";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Plus from "lucide-react/icons/plus";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
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
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createApiKey,
  deleteApiKey,
  rollApiKey,
  useApiKeys,
} from "@/services/api-keys-service";

const columns: ColumnDef<ApiKey>[] = [
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
    id: "actions",
    cell: ({ row }) => {
      const apiKey = row.original;
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
                    new CustomEvent("rollApiTokenTrigger", {
                      detail: apiKey.id,
                    })
                  )
                }
              >
                Roll Key
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("deleteApiTokenTrigger", {
                      detail: apiKey.id,
                    })
                  )
                }
              >
                Delete Key
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function ApiKeysPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { apiKeys, apiKeysError, isApiKeysLoading, mutateApiKeys } =
    useApiKeys();
  const { organization } = useAuth();

  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  const [tokenToRoll, setTokenToRoll] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRollDialogOpen, setIsRollDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdKeyToShow, setCreatedKeyToShow] = useState<string | null>(null);
  const [isShowKeyDialogOpen, setIsShowKeyDialogOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "API Keys" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setTokenToDelete(custom.detail);
        setIsDeleteDialogOpen(true);
      }
    };
    const handleRollEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setTokenToRoll(custom.detail);
        setIsRollDialogOpen(true);
      }
    };
    document.addEventListener("deleteApiTokenTrigger", handleDeleteEvent);
    document.addEventListener("rollApiTokenTrigger", handleRollEvent);
    return () => {
      document.removeEventListener("deleteApiTokenTrigger", handleDeleteEvent);
      document.removeEventListener("rollApiTokenTrigger", handleRollEvent);
    };
  }, []);

  const handleDeleteKey = useCallback(async (): Promise<void> => {
    if (!tokenToDelete || !organization?.handle) return;
    setIsProcessing(true);
    try {
      await deleteApiKey(tokenToDelete, organization.handle);
      toast.success("API key deleted successfully");
      await mutateApiKeys();
    } catch (error) {
      toast.error("Failed to delete API key. Please try again.");
      console.error("Delete API Key Error:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTokenToDelete(null);
      setIsProcessing(false);
    }
  }, [tokenToDelete, organization?.handle, mutateApiKeys]);

  const handleRollKey = useCallback(async (): Promise<void> => {
    if (!tokenToRoll || !organization?.handle) return;
    setIsProcessing(true);
    try {
      const rolledKey = await rollApiKey(tokenToRoll, organization.handle);
      setCreatedKeyToShow(rolledKey.apiKey);
      setIsRollDialogOpen(false);
      setIsShowKeyDialogOpen(true);
      toast.success("API key rolled successfully");
      await mutateApiKeys();
    } catch (error) {
      toast.error("Failed to roll API key. Please try again.");
      console.error("Roll API Key Error:", error);
    } finally {
      setTokenToRoll(null);
      setIsProcessing(false);
    }
  }, [tokenToRoll, organization?.handle, mutateApiKeys]);

  const handleCreateKey = useCallback(async (): Promise<void> => {
    if (!newKeyName.trim() || !organization?.handle) {
      toast.error("Key name is required");
      return;
    }
    setIsProcessing(true);
    try {
      const newKey = await createApiKey(newKeyName.trim(), organization.handle);
      setCreatedKeyToShow(newKey.apiKey);
      setIsCreateDialogOpen(false);
      setIsShowKeyDialogOpen(true);
      setNewKeyName("");
      toast.success("API key created");
      await mutateApiKeys();
    } catch (error) {
      toast.error("Failed to create API key. Please try again.");
      console.error("Create API Key Error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [newKeyName, organization?.handle, mutateApiKeys]);

  const handleShowKeyDialogClose = useCallback((open: boolean) => {
    setIsShowKeyDialogOpen(open);
    if (!open) {
      setCreatedKeyToShow(null);
    }
  }, []);

  const handleCopyKey = useCallback(async (): Promise<void> => {
    if (!createdKeyToShow) return;
    await navigator.clipboard.writeText(createdKeyToShow);
    toast.success("API key copied to clipboard");
  }, [createdKeyToShow]);

  if (isApiKeysLoading && !apiKeys) {
    return <InsetLoading title="API Keys" />;
  } else if (apiKeysError) {
    return <InsetError title="API Keys" errorMessage={apiKeysError.message} />;
  }

  return (
    <InsetLayout title="API Keys">
      <div className="flex items-center justify-between mb-6 min-h-10">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Manage API keys to access your workflows programmatically.
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={apiKeys || []}
        emptyState={{
          title: "No API keys found",
          description: "Create your first key to get started.",
        }}
      />
      <AlertDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Name your API key</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a descriptive name to help you identify this key later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            placeholder="Key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            disabled={isProcessing}
            maxLength={64}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewKeyName("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateKey}
              disabled={isProcessing || !newKeyName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? "Creating..." : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isShowKeyDialogOpen}
        onOpenChange={handleShowKeyDialogClose}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>API Key Created</AlertDialogTitle>
            <AlertDialogDescription>
              This is your new API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Copy it now—you won't be able to see it again!
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2 bg-muted rounded px-3 py-2 font-mono text-sm select-all overflow-x-auto w-full">
            <span className="truncate whitespace-pre w-full block">
              {createdKeyToShow}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleCopyKey}
              className="ml-2"
            >
              <Copy className="w-4 h-4" />
              <span className="sr-only">Copy key</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsShowKeyDialogOpen(false)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isRollDialogOpen} onOpenChange={setIsRollDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new secret for this API key. The old secret
              will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTokenToRoll(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollKey}
              disabled={isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              {isProcessing ? "Rolling..." : "Roll Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTokenToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
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
