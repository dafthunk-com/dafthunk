import ExternalLink from "lucide-react/icons/external-link";
import { useEffect } from "react";
import { useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTelegramBot } from "@/services/telegram-bot-service";

export function BotTelegramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const { telegramBot, telegramBotError, isTelegramBotLoading } =
    useTelegramBot(id || null);

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
      <InsetError
        title="Bot Details"
        errorMessage={telegramBotError.message}
      />
    );
  } else if (!telegramBot) {
    return <InsetError title="Bot Details" errorMessage="Bot not found" />;
  }

  return (
    <InsetLayout title="Bot Details">
      <div className="space-y-6 max-w-2xl">
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
          {telegramBot.botUsername && (
            <div className="grid grid-cols-[180px_1fr] gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Telegram Link
              </span>
              <a
                href={`https://t.me/${telegramBot.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                @{telegramBot.botUsername}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
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
      <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
