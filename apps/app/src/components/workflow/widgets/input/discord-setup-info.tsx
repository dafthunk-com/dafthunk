import { ExternalLink } from "lucide-react";

import { getApiBaseUrl } from "@/config/api";

import { CopyableValue } from "./copyable-value";

interface DiscordBotSetupInfoProps {
  botId: string;
  applicationId: string;
}

export function DiscordBotSetupInfo({
  botId,
  applicationId,
}: DiscordBotSetupInfoProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const webhookUrl = `${baseUrl}/discord/webhook/${botId}`;
  const portalUrl = `https://discord.com/developers/applications/${applicationId}/information`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Interactions Endpoint URL</p>
        <CopyableValue value={webhookUrl} />
        <p className="text-muted-foreground text-xs">
          Paste this as the Interactions Endpoint URL in the{" "}
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Discord Developer Portal
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </div>
    </div>
  );
}
