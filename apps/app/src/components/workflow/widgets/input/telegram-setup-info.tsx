import { ExternalLink } from "lucide-react";

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
