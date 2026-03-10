import ExternalLink from "lucide-react/icons/external-link";
import Pencil from "lucide-react/icons/pencil";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTelegramBot } from "@/services/telegram-bot-service";

import { BotTelegramEditDialog } from "./bot-telegram-edit-dialog";

export function BotTelegramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const {
    telegramBot,
    telegramBotError,
    isTelegramBotLoading,
    mutateTelegramBot,
  } = useTelegramBot(id || null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Bots", to: getOrgUrl("bots") },
      { label: telegramBot?.name || id || "" },
    ]);
  }, [id, telegramBot?.name, setBreadcrumbs, getOrgUrl]);

  if (isTelegramBotLoading) {
    return <InsetLoading title="Bot Details" />;
  } else if (telegramBotError) {
    return (
      <InsetError title="Bot Details" errorMessage={telegramBotError.message} />
    );
  } else if (!telegramBot) {
    return <InsetError title="Bot Details" errorMessage="Bot not found" />;
  }

  return (
    <InsetLayout title="Bot Details">
      <div className="space-y-8 max-w-2xl">
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
          <DetailRow label="Name" value={telegramBot.name || "Untitled Bot"} />
          <DetailRow
            label="Bot Username"
            value={
              telegramBot.botUsername ? `@${telegramBot.botUsername}` : "---"
            }
          />
          <DetailRow
            label="Token"
            value={`****${telegramBot.tokenLastFour}`}
            mono
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Links</h3>
          <div className="flex flex-col gap-2">
            {telegramBot.botUsername && (
              <a
                href={`https://t.me/${telegramBot.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open @{telegramBot.botUsername} on Telegram
              </a>
            )}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open @BotFather on Telegram
            </a>
            <a
              href="https://core.telegram.org/bots/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Telegram Bot API Documentation
            </a>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Create a workflow with a{" "}
              <span className="font-medium text-foreground">
                Receive Telegram Message
              </span>{" "}
              trigger node and select this bot.
            </li>
            <li>
              Enable the workflow. The webhook will be registered automatically
              with Telegram.
            </li>
            <li>
              Send a message to{" "}
              {telegramBot.botUsername ? (
                <a
                  href={`https://t.me/${telegramBot.botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  @{telegramBot.botUsername}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "your bot"
              )}{" "}
              on Telegram to trigger the workflow.
            </li>
          </ol>
        </div>
      </div>
      <BotTelegramEditDialog
        bot={telegramBot}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={() => mutateTelegramBot()}
      />
    </InsetLayout>
  );
}
