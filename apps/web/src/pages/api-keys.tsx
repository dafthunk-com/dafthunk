import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsetLayout } from "@/components/layouts/inset-layout";

// Mock data - replace with actual data fetching later
const mockApiKeys = [
  {
    id: "key_1",
    name: "Production Key",
    tokenPrefix: "prod_...",
    createdAt: "2023-10-26",
    lastUsed: "2024-05-15",
    status: "active",
  },
  {
    id: "key_2",
    name: "Development Key",
    tokenPrefix: "dev_...",
    createdAt: "2024-01-10",
    lastUsed: "2024-06-20",
    status: "active",
  },
  {
    id: "key_3",
    name: "Revoked Key",
    tokenPrefix: "rvk_...",
    createdAt: "2023-08-01",
    lastUsed: "2023-09-01",
    status: "revoked",
  },
];

type ApiKey = (typeof mockApiKeys)[0];

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  const handleCreateKey = () => {
    // Mock creation - replace with actual API call
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName || `New Key ${apiKeys.length + 1}`,
      tokenPrefix: "new_...",
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      status: "active",
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    setIsCreateDialogOpen(false);
    // TODO: Show the generated key to the user securely
  };

  const handleRevokeKey = (keyId: string) => {
    // Mock revocation - replace with actual API call
    setApiKeys(
      apiKeys.map((key) =>
        key.id === keyId ? { ...key, status: "revoked" } : key
      )
    );
    // TODO: Add confirmation dialog
  };

  return (
    <InsetLayout title="API Keys">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          Manage your API keys for accessing DaftHunk services.
        </p>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Give your new key a descriptive name. The key will be displayed
                only once after creation.
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
                  placeholder="e.g., My Production Key"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey}>Create Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Token Prefix</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>{key.tokenPrefix}</TableCell>
                <TableCell>{key.createdAt}</TableCell>
                <TableCell>{key.lastUsed}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      key.status === "active" ? "default" : "destructive"
                    }
                  >
                    {key.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* <DropdownMenuItem>View Details</DropdownMenuItem> */}
                      {key.status === "active" && (
                        <DropdownMenuItem
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Revoke Key
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground mt-4">
        Showing <strong>{apiKeys.length}</strong> API keys.
      </div>
    </InsetLayout>
  );
}
