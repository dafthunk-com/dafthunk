import { ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useTelegramBots } from "@/services/telegram-bot-service";
import { useTelegramTrigger } from "@/services/workflow-service";

interface TelegramTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  workflowId: string;
}

export function TelegramTriggerDialog({
  isOpen,
  onClose,
  workflowId,
}: TelegramTriggerDialogProps) {
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { telegramTrigger, isTelegramTriggerLoading, mutateTelegramTrigger } =
    useTelegramTrigger(workflowId, { revalidateOnFocus: false });

  const { telegramBots, isTelegramBotsLoading } = useTelegramBots();

  useEffect(() => {
    if (isOpen) {
      mutateTelegramTrigger();
    }
  }, [isOpen, mutateTelegramTrigger]);

  const isLoading = isTelegramTriggerLoading || isTelegramBotsLoading;
  const selectedBot = telegramBots.find(
    (b) => b.id === telegramTrigger?.telegramBotId
  );
  const botUsername = selectedBot?.botUsername;
  const botLink = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Telegram Trigger
          </DialogTitle>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !telegramTrigger ? (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No Telegram trigger configured
              </p>
              <p>
                Configure the Receive Telegram Message node to set up this
                trigger by selecting a bot.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Bot</Label>
                <p className="text-sm">
                  {selectedBot
                    ? `${selectedBot.name}${botUsername ? ` (@${botUsername})` : ""}`
                    : telegramTrigger.telegramBotId ?? "Unknown"}
                </p>
              </div>

              {botLink && (
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open @{botUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Chat ID</Label>
                <p className="text-sm font-mono">
                  {telegramTrigger.chatId ?? "Any chat"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <p className="text-sm">
                  {telegramTrigger.active ? (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-medium">
                      Inactive
                    </span>
                  )}
                </p>
              </div>

              {telegramBots.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  <Link
                    to={`/org/${orgHandle}/telegram-bots`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Manage Telegram Bots
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
