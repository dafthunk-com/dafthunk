import Copy from "lucide-react/icons/copy";
import ExternalLink from "lucide-react/icons/external-link";
import { useEffect } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/config/api";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDiscordBot } from "@/services/discord-bot-service";

export function BotDiscordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const { discordBot, discordBotError, isDiscordBotLoading } = useDiscordBot(
    id || null
  );

  useEffect(() => {
    setBreadcrumbs([
      { label: "Bots", to: getOrgUrl("bots") },
      { label: discordBot?.name || id || "" },
    ]);
  }, [id, discordBot?.name, setBreadcrumbs, getOrgUrl]);

  if (isDiscordBotLoading) {
    return <InsetLoading title="Bot Details" />;
  } else if (discordBotError) {
    return (
      <InsetError title="Bot Details" errorMessage={discordBotError.message} />
    );
  } else if (!discordBot) {
    return <InsetError title="Bot Details" errorMessage="Bot not found" />;
  }

  const webhookUrl = `${getApiBaseUrl()}/discord/webhook/${discordBot.id}`;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${discordBot.applicationId}&scope=bot+applications.commands&permissions=2048`;
  const devPortalUrl = `https://discord.com/developers/applications/${discordBot.applicationId}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <InsetLayout title="Bot Details">
      <div className="space-y-8 max-w-2xl">
        <div className="space-y-4">
          <DetailRow label="Name" value={discordBot.name || "Untitled Bot"} />
          <DetailRow
            label="Application ID"
            value={discordBot.applicationId}
            mono
          />
          <DetailRow label="Public Key" value={discordBot.publicKey} mono />
          <DetailRow
            label="Token"
            value={`****${discordBot.tokenLastFour}`}
            mono
          />
          <div className="grid grid-cols-[180px_1fr] gap-2 items-start">
            <span className="text-sm font-medium text-muted-foreground">
              Webhook URL
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono break-all">{webhookUrl}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Links</h3>
          <div className="flex flex-col gap-2">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Invite bot to a server
            </a>
            <a
              href={devPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Discord Developer Portal
            </a>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Copy the <span className="font-medium text-foreground">Webhook URL</span> above
              and paste it as the Interactions Endpoint URL in your{" "}
              <a
                href={devPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Discord application settings
              </a>
              .
            </li>
            <li>
              Use the <span className="font-medium text-foreground">Invite</span> link
              to add the bot to your Discord server.
            </li>
            <li>
              Create a workflow with a{" "}
              <span className="font-medium text-foreground">
                Receive Discord Message
              </span>{" "}
              trigger node and select this bot.
            </li>
          </ol>
        </div>
      </div>
    </InsetLayout>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 items-center">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
