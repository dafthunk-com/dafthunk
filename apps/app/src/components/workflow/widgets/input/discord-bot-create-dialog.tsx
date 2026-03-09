import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createDiscordBot } from "@/services/discord-bot-service";

import { DiscordBotSetupInfo } from "../../bot-setup-info";

type Step = "application" | "bot-token" | "webhook" | "command" | "invite";

const STEP_TITLES: Record<Step, string> = {
  application: "Create a Discord Application",
  "bot-token": "Bot Token",
  webhook: "Interactions Endpoint",
  command: "Slash Command",
  invite: "Add Bot to Server",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  application:
    "Create a new application in the Discord Developer Portal, then copy the Application ID and Public Key from the General Information page.",
  "bot-token":
    "Copy the token from the Bot page in the Discord Developer Portal.",
  webhook:
    "Copy the webhook URL below and paste it as the Interactions Endpoint URL in the Discord Developer Portal.",
  command:
    "Choose a name for the slash command that will trigger this workflow.",
  invite: "Add the bot to a Discord server so it can receive slash commands.",
};

interface DiscordBotCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (botId: string) => void;
  onCommandNameSet?: (commandName: string) => void;
  showCommandStep?: boolean;
}

export function DiscordBotCreateDialog({
  isOpen,
  onClose,
  onCreated,
  onCommandNameSet,
  showCommandStep = true,
}: DiscordBotCreateDialogProps) {
  const { organization } = useAuth();
  const [step, setStep] = useState<Step>("application");
  const [name, setName] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [botToken, setBotToken] = useState("");
  const [commandName, setCommandName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);

  const resetForm = () => {
    setStep("application");
    setName("");
    setApplicationId("");
    setPublicKey("");
    setBotToken("");
    setCommandName("");
    setError(null);
    setCreatedBotId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!organization?.handle) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createDiscordBot(
        { name, botToken, applicationId, publicKey },
        organization.handle
      );
      setCreatedBotId(response.id);
      setStep("webhook");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommandNext = () => {
    if (commandName.trim() && onCommandNameSet) {
      onCommandNameSet(commandName.trim());
    }
    setStep("invite");
  };

  const generalInfoUrl = applicationId
    ? `https://discord.com/developers/applications/${applicationId}/information`
    : "https://discord.com/developers/applications";

  const botSettingsUrl = applicationId
    ? `https://discord.com/developers/applications/${applicationId}/bot`
    : "https://discord.com/developers/applications";

  const inviteUrl = applicationId
    ? `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=bot+applications.commands&permissions=2048`
    : null;

  const canAdvanceToToken =
    name.trim() !== "" &&
    applicationId.trim() !== "" &&
    publicKey.trim() !== "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[450px]">
        <div>
          <DialogTitle className="text-base font-semibold">
            {STEP_TITLES[step]}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {STEP_DESCRIPTIONS[step]}
            {step === "application" && (
              <>
                {" "}
                <a
                  href={generalInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Open Discord Developer Portal
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            )}
          </DialogDescription>
        </div>

        {step === "application" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="discord-name">Name</Label>
              <Input
                id="discord-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Discord Bot"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this bot in Dafthunk.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discord-app-id">Application ID</Label>
              <Input
                id="discord-app-id"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                placeholder="123456789012345678"
              />
              <p className="text-xs text-muted-foreground">
                Copy from the{" "}
                <a
                  href={generalInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  General Information
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                page in the Discord Developer Portal.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discord-public-key">Public Key</Label>
              <Input
                id="discord-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="abc123..."
              />
              <p className="text-xs text-muted-foreground">
                Copy from the same{" "}
                <a
                  href={generalInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  General Information
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                page. Used to verify interaction signatures.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("bot-token")}
                disabled={!canAdvanceToToken}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "bot-token" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="discord-token">Bot Token</Label>
              <Input
                id="discord-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Copy the token from the{" "}
                <a
                  href={botSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Bot
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                page in the Discord Developer Portal.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep("application");
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || botToken.trim() === ""}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Creating...
                  </>
                ) : (
                  "Create Bot"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "webhook" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                Created
              </span>
              <span className="font-medium">{name}</span>
            </div>

            {createdBotId && (
              <DiscordBotSetupInfo
                botId={createdBotId}
                applicationId={applicationId}
              />
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(showCommandStep ? "command" : "invite")}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "command" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="discord-command">Command Name</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="discord-command"
                  value={commandName}
                  onChange={(e) => setCommandName(e.target.value)}
                  placeholder="ask"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Users will type /{commandName || "command"} in Discord to
                trigger this workflow.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("webhook")}
              >
                Back
              </Button>
              <Button
                onClick={handleCommandNext}
                disabled={commandName.trim() === ""}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "invite" && (
          <div className="space-y-4">
            {inviteUrl && (
              <div className="bg-muted/50 p-3 rounded-md">
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Add {name} to a Server
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  This will request the bot and slash commands permissions.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(showCommandStep ? "command" : "webhook")}
              >
                Back
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
