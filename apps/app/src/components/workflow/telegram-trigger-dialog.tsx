import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useTelegramBots } from "@/services/telegram-bot-service";
import {
  deleteTelegramTrigger,
  upsertTelegramTrigger,
  useTelegramTrigger,
} from "@/services/workflow-service";

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

  const [chatId, setChatId] = useState("");
  const [telegramBotId, setTelegramBotId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      mutateTelegramTrigger();
    }
  }, [isOpen, mutateTelegramTrigger]);

  useEffect(() => {
    if (telegramTrigger) {
      setChatId(telegramTrigger.chatId);
      setTelegramBotId(telegramTrigger.telegramBotId || null);
      setActive(telegramTrigger.active);
    }
  }, [telegramTrigger]);

  const handleSave = async () => {
    if (!chatId.trim()) {
      toast.error("Chat ID is required");
      return;
    }
    if (!telegramBotId) {
      toast.error("Telegram bot is required");
      return;
    }
    setSaving(true);
    try {
      await upsertTelegramTrigger(orgHandle, workflowId, {
        chatId: chatId.trim(),
        telegramBotId,
        active,
      });
      await mutateTelegramTrigger();
      toast.success("Telegram trigger saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await deleteTelegramTrigger(orgHandle, workflowId);
      await mutateTelegramTrigger();
      setChatId("");
      setTelegramBotId(null);
      setActive(true);
      toast.success("Telegram trigger removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!telegramTrigger;
  const selectedBot = telegramBots.find((b) => b.id === telegramBotId);
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
          {isTelegramTriggerLoading || isTelegramBotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : telegramBots.length === 0 ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                You need to add a Telegram bot before creating a trigger.
              </p>
              <Link
                to={`/org/${orgHandle}/telegram-bots`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Go to Telegram Bots
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="telegram-bot">Telegram Bot</Label>
                <Select
                  value={telegramBotId || ""}
                  onValueChange={(val) => setTelegramBotId(val || null)}
                  disabled={isConfigured}
                >
                  <SelectTrigger id="telegram-bot">
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {telegramBots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        {bot.name}
                        {bot.botUsername ? ` (@${bot.botUsername})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isConfigured && botLink && (
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p className="font-medium text-foreground mb-1">
                    Step 1: Add the bot to your chat
                  </p>
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open @{botUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-muted-foreground mt-1">
                    Search for the bot in Telegram, start a conversation, or add
                    it to a group.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="chat-id">Chat ID</Label>
                <Input
                  id="chat-id"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. 123456789"
                  readOnly={isConfigured}
                />
                <p className="text-xs text-muted-foreground">
                  Send /start to the bot — it will reply with your Chat ID. For
                  groups, add the bot and check the group Chat ID.
                </p>
              </div>

              {isConfigured && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="telegram-active">Active</Label>
                  <Switch
                    id="telegram-active"
                    checked={active}
                    onCheckedChange={setActive}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {isConfigured ? (
                  <>
                    <Button onClick={handleSave} disabled={saving} size="sm">
                      {saving ? "Updating..." : "Update"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRemove}
                      disabled={saving}
                      size="sm"
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving || !chatId.trim() || !telegramBotId}
                    size="sm"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
