import Copy from "lucide-react/icons/copy";
import ExternalLink from "lucide-react/icons/external-link";
import { useState } from "react";
import { toast } from "sonner";

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
import { getApiBaseUrl } from "@/config/api";
import { createSlackBot } from "@/services/bot-service";

type Step = "credentials" | "setup";

const STEP_TITLES: Record<Step, string> = {
  credentials: "Create a Slack Bot",
  setup: "Bot Created",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  credentials:
    "Create a Slack app at api.slack.com/apps, then copy the Bot User OAuth Token and Signing Secret.",
  setup:
    "Your bot is ready. Configure the Event Subscriptions URL in your Slack app settings.",
};

interface SlackBotCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (botId: string) => void;
}

export function SlackBotCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: SlackBotCreateDialogProps) {
  const { organization } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [createdTeamName, setCreatedTeamName] = useState<string | null>(null);

  const resetForm = () => {
    setStep("credentials");
    setName("");
    setBotToken("");
    setSigningSecret("");
    setError(null);
    setCreatedBotId(null);
    setCreatedTeamName(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!organization?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createSlackBot(
        { name, botToken, signingSecret },
        organization.id
      );
      setCreatedBotId(response.id);
      setCreatedTeamName(
        (response.metadata as Record<string, string | undefined> | null)
          ?.teamName ?? ""
      );
      setStep("setup");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const webhookUrl = createdBotId
    ? `${getApiBaseUrl()}/slack/webhook/${createdBotId}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[450px]">
        <div>
          <DialogTitle className="text-base font-semibold">
            {STEP_TITLES[step]}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {STEP_DESCRIPTIONS[step]}
            {step === "credentials" && (
              <>
                {" "}
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Open Slack API
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            )}
          </DialogDescription>
        </div>

        {step === "credentials" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="slack-name">Name</Label>
              <Input
                id="slack-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Slack Bot"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this bot in Dafthunk.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slack-token">Bot User OAuth Token</Label>
              <Input
                id="slack-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="xoxb-..."
              />
              <p className="text-xs text-muted-foreground">
                Found under{" "}
                <span className="font-medium">OAuth &amp; Permissions</span> in
                your Slack app settings.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slack-signing-secret">Signing Secret</Label>
              <Input
                id="slack-signing-secret"
                type="password"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Found under{" "}
                <span className="font-medium">Basic Information</span> in your
                Slack app settings.
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
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  name.trim() === "" ||
                  botToken.trim() === "" ||
                  signingSecret.trim() === ""
                }
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

        {step === "setup" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                Created
              </span>
              <span className="font-medium">
                {name}
                {createdTeamName && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({createdTeamName})
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("Webhook URL copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5 mt-2">
                <li>
                  Go to{" "}
                  <a
                    href="https://api.slack.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Event Subscriptions
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{" "}
                  in your Slack app and toggle{" "}
                  <span className="font-medium text-foreground">
                    Enable Events
                  </span>{" "}
                  to On.
                </li>
                <li>
                  Paste the Webhook URL above as the{" "}
                  <span className="font-medium text-foreground">
                    Request URL
                  </span>
                  . Slack will verify it automatically.
                </li>
                <li>
                  Under{" "}
                  <span className="font-medium text-foreground">
                    Subscribe to bot events
                  </span>
                  , add <span className="font-mono">message.channels</span> and{" "}
                  <span className="font-mono">message.groups</span>, then save.
                </li>
                <li>
                  Invite the bot to a channel and create a workflow with a{" "}
                  <span className="font-medium text-foreground">
                    Receive Slack Message
                  </span>{" "}
                  trigger.
                </li>
              </ol>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
