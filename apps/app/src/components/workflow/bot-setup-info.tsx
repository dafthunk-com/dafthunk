import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/config/api";

interface DiscordBotSetupInfoProps {
  botId: string;
  applicationId: string;
}

export function DiscordBotSetupInfo({
  botId,
  applicationId,
}: DiscordBotSetupInfoProps) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${getApiBaseUrl()}/discord/webhook/${botId}`;
  const portalUrl = `https://discord.com/developers/applications/${applicationId}/information`;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=bot+applications.commands&permissions=2048`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Interactions Endpoint URL</p>
        <div className="flex items-center gap-1">
          <code className="flex-1 text-xs bg-muted px-2 py-1 rounded break-all">
            {webhookUrl}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
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

      <div>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
        >
          Add Bot to Server
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

interface TelegramBotSetupInfoProps {
  botUsername: string | null;
}

export function TelegramBotSetupInfo({
  botUsername,
}: TelegramBotSetupInfoProps) {
  return (
    <div className="space-y-2 text-sm">
      {botUsername && (
        <div>
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
          >
            Open @{botUsername}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Webhook is auto-registered when you deploy the workflow.
      </p>
    </div>
  );
}
