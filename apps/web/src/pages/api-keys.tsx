import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { MoreHorizontal, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { format } from "date-fns";
import { API_BASE_URL } from "@/config/api";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Column definitions for API keys table
const columns: ColumnDef<ApiToken>[] = [
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
      const date = row.getValue("createdAt") as string;
      const formatted = format(new Date(date), "MMM d, yyyy");
      return <div>{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const token = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              // Using onClick instead of passing a delete function through table options meta
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent("deleteApiToken", { detail: token.id })
                )
              }
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function ApiKeysPage() {
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tableKey, setTableKey] = useState(0); // Force table re-renders

  // Create key dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isShowKeyDialogOpen, setIsShowKeyDialogOpen] = useState(false);

  // Fetch the API tokens with useCallback to prevent stale closures
  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch API tokens: ${response.statusText}`);
      }

      const data = await response.json();
      setApiTokens(data.tokens);
      // Force table refresh
      setTableKey(prev => prev + 1);
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      toast.error("Failed to fetch API tokens. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup event listener for delete action from the table
  useEffect(() => {
    const handleDeleteEvent = (e: CustomEvent) => {
      if (e.detail) {
        confirmDeleteKey(e.detail);
      }
    };

    document.addEventListener(
      "deleteApiToken",
      handleDeleteEvent as EventListener
    );

    return () => {
      document.removeEventListener(
        "deleteApiToken",
        handleDeleteEvent as EventListener
      );
    };
  }, []);

  // Load tokens on component mount
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const confirmDeleteKey = useCallback((tokenId: string) => {
    setTokenToDelete(tokenId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteKey = useCallback(async () => {
    if (!tokenToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tokens/${tokenToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete API token: ${response.statusText}`);
      }

      await fetchTokens(); // Get fresh data from server
      toast.success("API token deleted successfully");
    } catch (error) {
      console.error("Error deleting API token:", error);
      toast.error("Failed to delete API token. Please try again.");
    } finally {
      setIsDeleteDialogOpen(false);
      setTokenToDelete(null);
    }
  }, [tokenToDelete, fetchTokens]);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast.error("Key name is required");
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create API key: ${response.statusText}`);
      }
      const data = await response.json();
      setCreatedKey(data.token);
      await fetchTokens(); // Get fresh data
      setIsCreateDialogOpen(false);
      setIsShowKeyDialogOpen(true);
      setNewKeyName("");
      toast.success("API key created");
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [newKeyName, fetchTokens]);

  const handleDialogClose = useCallback((open: boolean) => {
    // If the dialog is closing, refresh tokens
    if (!open && isShowKeyDialogOpen) {
      fetchTokens();
    }
    setIsShowKeyDialogOpen(open);
  }, [fetchTokens, isShowKeyDialogOpen]);

  const handleCopyKey = useCallback(async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      toast.success("API key copied to clipboard");
    }
  }, [createdKey]);

  return (
    <InsetLayout title="API Keys">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground max-w-2xl">
          Create, manage, and delete API keys to control access for your applications.
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          size="sm"
        >
          + Create API Key
        </Button>
      </div>
      <DataTable
        key={tableKey} // Force re-render with new data
        columns={columns}
        data={apiTokens}
        isLoading={isLoading}
        emptyState={{
          title: "No API keys found",
          description: "Create your first key to get started.",
        }}
        info={
          !isLoading && (
            <div className="text-xs text-muted-foreground">
              Showing <strong>{apiTokens.length}</strong> API keys.
            </div>
          )
        }
      />

      {/* Create Key Dialog */}
      <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            disabled={isCreating}
            maxLength={64}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewKeyName("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateKey}
              disabled={isCreating || !newKeyName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {isCreating ? "Creating..." : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Show Key Dialog */}
      <AlertDialog open={isShowKeyDialogOpen} onOpenChange={handleDialogClose}>
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
            <span className="truncate whitespace-pre w-full block">{createdKey}</span>
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

      {/* Delete Key Dialog */}
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
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </InsetLayout>
  );
}
