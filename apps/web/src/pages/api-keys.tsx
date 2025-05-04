import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { MoreHorizontal, Trash2 } from "lucide-react";
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

  return (
    <InsetLayout title="API Keys">
      <DataTable
        columns={columns}
        data={apiTokens}
        isLoading={isLoading}
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
