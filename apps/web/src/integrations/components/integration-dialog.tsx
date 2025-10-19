import type { IntegrationProvider } from "@dafthunk/types";
import ExternalLink from "lucide-react/icons/external-link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useIntegrationActions } from "../hooks/use-integration-actions";
import { getAllProviders, getProviderLabel } from "../providers";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationDialog({
  open,
  onOpenChange,
}: IntegrationDialogProps) {
  const { isProcessing, connectOAuth, createManual } = useIntegrationActions();
  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProvider>("google-mail");
  const [integrationName, setIntegrationName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const providers = getAllProviders();
  const currentProvider = providers.find((p) => p.id === selectedProvider);

  const handleConnect = () => {
    if (!currentProvider) return;

    if (currentProvider.supportsOAuth) {
      connectOAuth(selectedProvider);
      onOpenChange(false);
    } else {
      handleCreateManual();
    }
  };

  const handleCreateManual = async () => {
    if (!integrationName || !apiKey) return;

    try {
      await createManual(selectedProvider, integrationName, apiKey);
      onOpenChange(false);
      setIntegrationName("");
      setApiKey("");
      setSelectedProvider("google-mail");
    } catch {
      // Error is already handled in the hook
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedProvider("google-mail");
    setIntegrationName("");
    setApiKey("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Integration</DialogTitle>
          <DialogDescription>
            Connect a third-party service to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={(value) =>
                setSelectedProvider(value as IntegrationProvider)
              }
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {currentProvider?.description}
            </p>
          </div>

          {!currentProvider?.supportsOAuth && (
            <>
              {currentProvider?.apiKeyInstructions && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    {currentProvider.apiKeyInstructions}
                  </p>
                  {currentProvider.apiKeyUrl && (
                    <Button
                      variant="link"
                      className="h-auto p-0 mt-2 text-xs"
                      asChild
                    >
                      <a
                        href={currentProvider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Get API Key
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="integration-name">Integration Name</Label>
                <Input
                  id="integration-name"
                  placeholder="e.g., Production Key"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Will be saved as: {getProviderLabel(selectedProvider)} -{" "}
                  {integrationName || "..."}
                </p>
              </div>
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={
              isProcessing ||
              (!currentProvider?.supportsOAuth && (!integrationName || !apiKey))
            }
          >
            {isProcessing
              ? "Processing..."
              : currentProvider?.supportsOAuth
                ? "Connect"
                : "Add Integration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
