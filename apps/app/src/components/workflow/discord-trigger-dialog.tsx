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
import { useDiscordBots } from "@/services/discord-bot-service";
import {
  deleteDiscordTrigger,
  upsertDiscordTrigger,
  useDiscordTrigger,
} from "@/services/workflow-service";

interface DiscordTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  workflowId: string;
}

export function DiscordTriggerDialog({
  isOpen,
  onClose,
  workflowId,
}: DiscordTriggerDialogProps) {
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { discordTrigger, isDiscordTriggerLoading, mutateDiscordTrigger } =
    useDiscordTrigger(workflowId, { revalidateOnFocus: false });

  const { discordBots, isDiscordBotsLoading } = useDiscordBots();

  const [guildId, setGuildId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [discordBotId, setDiscordBotId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      mutateDiscordTrigger();
    }
  }, [isOpen, mutateDiscordTrigger]);

  useEffect(() => {
    if (discordTrigger) {
      setGuildId(discordTrigger.guildId);
      setChannelId(discordTrigger.channelId || "");
      setDiscordBotId(discordTrigger.discordBotId || null);
      setActive(discordTrigger.active);
    }
  }, [discordTrigger]);

  const handleSave = async () => {
    if (!guildId.trim()) {
      toast.error("Server ID is required");
      return;
    }
    if (!discordBotId) {
      toast.error("Discord bot is required");
      return;
    }
    setSaving(true);
    try {
      await upsertDiscordTrigger(orgHandle, workflowId, {
        guildId: guildId.trim(),
        channelId: channelId.trim() || null,
        discordBotId,
        active,
      });
      await mutateDiscordTrigger();
      toast.success("Discord trigger saved");
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
      await deleteDiscordTrigger(orgHandle, workflowId);
      await mutateDiscordTrigger();
      setGuildId("");
      setChannelId("");
      setDiscordBotId(null);
      setActive(true);
      toast.success("Discord trigger removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = !!discordTrigger;
  const selectedBot = discordBots.find((b) => b.id === discordBotId);
  const inviteAppId = selectedBot?.applicationId;
  const inviteUrl = inviteAppId
    ? `https://discord.com/oauth2/authorize?client_id=${inviteAppId}&scope=bot&permissions=2048`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Discord Trigger
          </DialogTitle>
        </div>

        <div className="p-4">
          {isDiscordTriggerLoading || isDiscordBotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : discordBots.length === 0 ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                You need to add a Discord bot before creating a trigger.
              </p>
              <Link
                to={`/org/${orgHandle}/discord-bots`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Go to Discord Bots
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="discord-bot">Discord Bot</Label>
                <Select
                  value={discordBotId || ""}
                  onValueChange={(val) => setDiscordBotId(val || null)}
                  disabled={isConfigured}
                >
                  <SelectTrigger id="discord-bot">
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {discordBots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        {bot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isConfigured && inviteUrl && (
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <p className="font-medium text-foreground mb-1">
                    Step 1: Add the bot to your server
                  </p>
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Add Bot to Server
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="guild-id">Server ID</Label>
                <Input
                  id="guild-id"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="e.g. 123456789012345678"
                  readOnly={isConfigured}
                />
                <p className="text-xs text-muted-foreground">
                  Right-click your server name and select "Copy Server ID"
                  (requires Developer Mode in Discord settings).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="channel-id">Channel ID (optional)</Label>
                <Input
                  id="channel-id"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="Leave empty for all channels"
                  readOnly={isConfigured}
                />
                <p className="text-xs text-muted-foreground">
                  Right-click a channel and select "Copy Channel ID" to filter
                  messages from a specific channel.
                </p>
              </div>

              {isConfigured && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="discord-active">Active</Label>
                  <Switch
                    id="discord-active"
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
                    disabled={saving || !guildId.trim() || !discordBotId}
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
