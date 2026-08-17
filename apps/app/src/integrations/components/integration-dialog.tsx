import type { IntegrationProvider } from "@dafthunk/types";
import ExternalLink from "lucide-react/icons/external-link";
import { useMemo, useState } from "react";

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
import { cn } from "@/utils/utils";

import { useAvailableProviders } from "../hooks/use-available-providers";
import { useIntegrationActions } from "../hooks/use-integration-actions";
import { getAvailableProviders, getProviderLabel } from "../providers";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationDialog({
  open,
  onOpenChange,
}: IntegrationDialogProps) {
  const { isProcessing, connectOAuth, createManual } = useIntegrationActions();
  const { providers: availableProviderIds, isLoading: isLoadingProviders } =
    useAvailableProviders();

  const [selectedProvider, setSelectedProvider] =
    useState<IntegrationProvider | null>(null);
  const [integrationName, setIntegrationName] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Memoize providers list
  const providers = useMemo(
    () =>
      availableProviderIds && availableProviderIds.length > 0
        ? getAvailableProviders(availableProviderIds)
        : [],
    [availableProviderIds]
  );

  // Memoize current provider
  const currentProvider = useMemo(
    () => providers.find((p) => p.id === selectedProvider),
    [providers, selectedProvider]
  );

  // Reset form state
  const resetForm = () => {
    setIntegrationName("");
    setApiKey("");
    setSelectedProvider(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSelectProvider = (providerId: IntegrationProvider) => {
    setSelectedProvider(providerId);
    setIntegrationName("");
    setApiKey("");
  };

  const handleConnect = async () => {
    if (!currentProvider || !selectedProvider) return;

    if (currentProvider.supportsOAuth) {
      connectOAuth(selectedProvider);
      handleClose();
    } else {
      if (!integrationName || !apiKey) return;

      try {
        await createManual(selectedProvider, integrationName, apiKey);
        handleClose();
      } catch {
        // Error is already handled in the hook
      }
    }
  };

  // Determine dialog content based on state
  let content: React.ReactNode;
  let footer: React.ReactNode;

  if (isLoadingProviders) {
    content = (
      <p className="text-sm text-muted-foreground">
        Loading available providers...
      </p>
    );
  } else if (providers.length === 0) {
    content = (
      <p className="text-sm text-muted-foreground">
        No integration providers are currently configured. Please contact your
        administrator.
      </p>
    );
    footer = <Button onClick={handleClose}>Close</Button>;
  } else {
    const isOAuth = currentProvider?.supportsOAuth;
    const canSubmit =
      currentProvider && (isOAuth || (integrationName && apiKey));

    content = (
      <div className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Provider"
          className="grid grid-cols-3 gap-2"
        >
          {providers.map((provider) => {
            const Icon = provider.icon;
            const isSelected = provider.id === selectedProvider;
            return (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectProvider(provider.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center">
                  {provider.name}
                </span>
              </button>
            );
          })}
        </div>

        {currentProvider && (
          <p className="text-sm text-muted-foreground">
            {currentProvider.description}
          </p>
        )}

        {currentProvider && !isOAuth && (
          <>
            {currentProvider.apiKeyInstructions && (
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
                Will be saved as:{" "}
                {selectedProvider ? getProviderLabel(selectedProvider) : "..."}{" "}
                - {integrationName || "..."}
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
    );

    footer = (
      <>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConnect} disabled={isProcessing || !canSubmit}>
          {isProcessing
            ? "Processing..."
            : isOAuth
              ? "Connect"
              : "Add Integration"}
        </Button>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Integration</DialogTitle>
          <DialogDescription>
            Connect a third-party service to your organization.
          </DialogDescription>
        </DialogHeader>
        {content}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
