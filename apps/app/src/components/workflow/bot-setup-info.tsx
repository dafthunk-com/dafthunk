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
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">
              Receive Telegram Message
            </span>{" "}
            trigger and select this bot.
          </li>
          <li>
            Deploy the workflow. The webhook will be registered automatically
            with Telegram.
          </li>
          <li>
            Send a message to{" "}
            {botUsername ? (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                @{botUsername}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              "your bot"
            )}{" "}
            on Telegram to trigger the workflow.
          </li>
        </ol>
      </div>
    </div>
  );
}
