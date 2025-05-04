import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { AlertCircle, Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { API_BASE_URL } from "@/config/api";
import { ColumnDef } from "@tanstack/react-table";

interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface TokenResponse {
  token: string;
  tokenRecord: ApiToken;
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
              onClick={() => document.dispatchEvent(new CustomEvent('deleteApiToken', { detail: token.id }))}
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
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Setup event listener for delete action from the table
  useEffect(() => {
    const handleDeleteEvent = (e: CustomEvent) => {
      if (e.detail) {
        confirmDeleteKey(e.detail);
      }
    };
    
    document.addEventListener('deleteApiToken', handleDeleteEvent as EventListener);
    
    return () => {
      document.removeEventListener('deleteApiToken', handleDeleteEvent as EventListener);
    };
  }, []);

  // Fetch the API tokens
  const fetchTokens = async () => {
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
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      toast.error("Failed to fetch API tokens. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load tokens on component mount
  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for your API key.");
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newKeyName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create API token: ${response.statusText}`);
      }

      const data: TokenResponse = await response.json();

      // Store the token to display to the user
      setNewToken(data.token);

      // Add the new token to the list
      setApiTokens([...apiTokens, data.tokenRecord]);

      setNewKeyName("");
      // Keep dialog open to show the token
    } catch (error) {
      console.error("Error creating API token:", error);
      toast.error("Failed to create API token. Please try again.");
      setIsCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDeleteKey = (tokenId: string) => {
    setTokenToDelete(tokenId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteKey = async () => {
    if (!tokenToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tokens/${tokenToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete API token: ${response.statusText}`);
      }

      // Update the local state to remove the deleted token
      setApiTokens(apiTokens.filter((token) => token.id !== tokenToDelete));

      toast.success("API token deleted successfully");
    } catch (error) {
      console.error("Error deleting API token:", error);
      toast.error("Failed to delete API token. Please try again.");
    } finally {
      setIsDeleteDialogOpen(false);
      setTokenToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API token copied to clipboard");
  };

  // Dialog content changes based on whether we're showing a new token
  const renderDialogContent = () => {
    if (newToken) {
      return (
        <>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              This is your API key. Make sure to copy it now as it will never be
              shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Alert variant="destructive" className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-1 flex-shrink-0" />
              <div>
                <AlertTitle>One time display</AlertTitle>
                <AlertDescription>
                  This API key will only be displayed once. Make sure to copy it
                  now and save it in a secure location.
                </AlertDescription>
              </div>
            </Alert>
            <div className="flex flex-col gap-3 mt-4">
              <Label htmlFor="api-key" className="text-sm font-medium">
                Your new API key
              </Label>
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                <code
                  id="api-key"
                  className="flex-1 text-sm break-all font-mono"
                >
                  {newToken}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(newToken)}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              onClick={() => {
                setNewToken(null);
                setIsCreateDialogOpen(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Give your new key a descriptive name. The key will be displayed only
            once after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Production Key"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNewKeyName("");
              setIsCreateDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateKey} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Key"}
          </Button>
        </DialogFooter>
      </>
    );
  };

  const toolbarContent = (
    <div className="flex items-center justify-between mb-6">
      <p className="text-muted-foreground">
        Manage your API keys for accessing your organization's services.
      </p>
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) setNewToken(null);
          setIsCreateDialogOpen(open);
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1">
            <Plus className="size-4" />
            Create New Key
          </Button>
        </DialogTrigger>
        <DialogContent>{renderDialogContent()}</DialogContent>
      </Dialog>
    </div>
  );

  return (
    <InsetLayout title="API Keys">
      <DataTable
        columns={columns}
        data={apiTokens}
        isLoading={isLoading}
        enableSorting={true}
        enablePagination={false}
        toolbar={toolbarContent}
        emptyState={{
          title: "No API keys found",
          description: "Create your first key to get started.",
        }}
      />
      {!isLoading && (
        <div className="text-xs text-muted-foreground mt-4">
          Showing <strong>{apiTokens.length}</strong> API keys.
        </div>
      )}

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
