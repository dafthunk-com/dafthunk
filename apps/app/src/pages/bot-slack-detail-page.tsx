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
import { useSlackBot } from "@/services/bot-service";

import { BotSlackEditDialog } from "./bot-slack-edit-dialog";

export function BotSlackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const { slackBot, slackBotError, isSlackBotLoading, mutateSlackBot } =
    useSlackBot(id || null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Bots", to: getOrgUrl("bots") },
      { label: slackBot?.name || id || "" },
    ]);
  }, [id, slackBot?.name, setBreadcrumbs, getOrgUrl]);

  if (isSlackBotLoading) {
    return <InsetLoading title="Bot Details" />;
  } else if (slackBotError) {
    return (
      <InsetError title="Bot Details" errorMessage={slackBotError.message} />
    );
  } else if (!slackBot) {
    return <InsetError title="Bot Details" errorMessage="Bot not found" />;
  }

  const webhookUrl = `${getApiBaseUrl()}/slack/webhook/${slackBot.id}`;

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
          <DetailRow label="Name" value={slackBot.name || "Untitled Bot"} />
          {slackBot.teamName && (
            <DetailRow label="Workspace" value={slackBot.teamName} />
          )}
          {slackBot.appId && (
            <DetailRow label="App ID" value={slackBot.appId} mono />
          )}
          <DetailRow
            label="Token"
            value={`****${slackBot.tokenLastFour}`}
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
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Slack API Portal
            </a>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Under{" "}
              <span className="font-medium text-foreground">
                Event Subscriptions
              </span>
              , toggle{" "}
              <span className="font-medium text-foreground">Enable Events</span>{" "}
              to On. Paste the Webhook URL above as the Request URL. Under{" "}
              <span className="font-medium text-foreground">
                Subscribe to bot events
              </span>
              , add <span className="font-mono">message.channels</span> and{" "}
              <span className="font-mono">message.groups</span>, then save.
            </li>
            <li>
              Under{" "}
              <span className="font-medium text-foreground">
                OAuth &amp; Permissions
              </span>
              , verify the bot has{" "}
              <span className="font-mono">channels:history</span>,{" "}
              <span className="font-mono">groups:history</span>, and{" "}
              <span className="font-mono">chat:write</span> scopes.
            </li>
            <li>
              Invite the bot to a channel with{" "}
              <span className="font-mono">/invite @{slackBot.name}</span>.
            </li>
            <li>
              Create a workflow with a{" "}
              <span className="font-medium text-foreground">
                Receive Slack Message
              </span>{" "}
              trigger, select this bot, and enable it.
            </li>
          </ol>
        </div>
      </div>
      <BotSlackEditDialog
        bot={slackBot}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={() => mutateSlackBot()}
      />
    </InsetLayout>
  );
}
