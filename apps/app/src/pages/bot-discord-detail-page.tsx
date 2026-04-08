import Copy from "lucide-react/icons/copy";
import ExternalLink from "lucide-react/icons/external-link";
import Pencil from "lucide-react/icons/pencil";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { getApiBaseUrl } from "@/config/api";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useDiscordBot } from "@/services/bot-service";

import { BotDiscordEditDialog } from "./bot-discord-edit-dialog";

export function BotDiscordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const { discordBot, discordBotError, isDiscordBotLoading, mutateDiscordBot } =
    useDiscordBot(id || null);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
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
              Copy the Webhook URL above and paste it as the Interactions
              Endpoint URL in the{" "}
              <a
                href={`${devPortalUrl}/information`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                General Information
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              page.
            </li>
            <li>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Invite the bot
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              to a Discord server.
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
      <BotDiscordEditDialog
        bot={discordBot}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={() => mutateDiscordBot()}
      />
    </InsetLayout>
  );
}
