import Copy from "lucide-react/icons/copy";
import { useCallback, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  updateOrganizationSettings,
  useOrganizationSettings,
} from "@/services/organizations-service";

export function McpPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();

  const {
    settings,
    settingsError,
    isSettingsLoading,
    mutateSettings,
  } = useOrganizationSettings(organization?.handle ?? "");

  useEffect(() => {
    setBreadcrumbs([{ label: "MCP Server" }]);
  }, [setBreadcrumbs]);

  const handleToggleMcp = useCallback(async (enabled: boolean) => {
    if (!organization?.handle) return;

    try {
      await updateOrganizationSettings(organization.handle, {
        mcpEnabled: enabled,
      });
      await mutateSettings();
      toast.success(enabled ? "MCP server enabled" : "MCP server disabled");
    } catch (error) {
      toast.error("Failed to update MCP settings");
      console.error("Error updating MCP settings:", error);
    }
  }, [organization?.handle, mutateSettings]);

  const handleCopyUrl = useCallback(async () => {
    if (!organization?.handle) return;
    const mcpUrl = `${window.location.origin.replace("app.", "api.")}/${organization.handle}/mcp`;
    await navigator.clipboard.writeText(mcpUrl);
    toast.success("Copied to clipboard");
  }, [organization?.handle]);

  if (isSettingsLoading) {
    return <InsetLoading title="MCP Server" />;
  }

  if (settingsError) {
    return <InsetError title="MCP Server" errorMessage={settingsError.message} />;
  }

  const mcpUrl = organization?.handle
    ? `${window.location.origin.replace("app.", "api.")}/${organization.handle}/mcp`
    : "";

  return (
    <InsetLayout title="MCP Server">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Enable MCP Server</CardTitle>
                <CardDescription>
                  Allow AI agents to connect via MCP protocol
                </CardDescription>
              </div>
              <Switch
                id="mcp-enabled"
                checked={settings?.mcpEnabled ?? true}
                onCheckedChange={handleToggleMcp}
              />
            </div>
          </CardHeader>
        </Card>

        {settings?.mcpEnabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 bg-muted rounded px-3 py-2 font-mono text-sm">
                <span className="truncate flex-1">{mcpUrl}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyUrl}
                >
                  <Copy className="w-4 h-4" />
                  <span className="sr-only">Copy URL</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Authenticate with an{" "}
                <Link
                  to={`/org/${organization?.handle}/api-keys`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  API key
                </Link>{" "}
                in the Authorization header.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </InsetLayout>
  );
}
