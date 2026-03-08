import { ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

import { useAuth } from "@/components/auth-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useDiscordBots } from "@/services/discord-bot-service";
import { useDiscordTrigger } from "@/services/workflow-service";

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

  useEffect(() => {
    if (isOpen) {
      mutateDiscordTrigger();
    }
  }, [isOpen, mutateDiscordTrigger]);

  const isLoading = isDiscordTriggerLoading || isDiscordBotsLoading;
  const selectedBot = discordBots.find(
    (b) => b.id === discordTrigger?.discordBotId
  );
  const inviteAppId = selectedBot?.applicationId;
  const inviteUrl = inviteAppId
    ? `https://discord.com/oauth2/authorize?client_id=${inviteAppId}&scope=bot+applications.commands&permissions=2048`
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !discordTrigger ? (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No Discord trigger configured
              </p>
              <p>
                Configure the Receive Discord Message node to set up this
                trigger by selecting a bot and entering a slash command name.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Bot</Label>
                <p className="text-sm">
                  {selectedBot?.name ??
                    discordTrigger.discordBotId ??
                    "Unknown"}
                </p>
              </div>

              {inviteUrl && (
                <div className="bg-muted/50 p-3 rounded-md text-sm">
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
                <Label>Slash Command</Label>
                <p className="text-sm font-mono">
                  /{discordTrigger.commandName}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <p className="text-sm">
                  {discordTrigger.active ? (
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

              <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  Setup Instructions
                </p>
                <p>
                  Set the Interactions Endpoint URL in the Discord Developer
                  Portal to enable slash command handling.
                </p>
              </div>

              {discordBots.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  <Link
                    to={`/org/${orgHandle}/discord-bots`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Manage Discord Bots
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
