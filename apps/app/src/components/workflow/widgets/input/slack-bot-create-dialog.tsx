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
import { getApiBaseUrl } from "@/config/api";
import { createSlackBot } from "@/services/bot-service";

import { CopyableValue } from "./copyable-value";

type Step =
  | "name"
  | "signing-secret"
  | "bot-token"
  | "event-subscriptions"
  | "setup";

const STEP_TITLES: Record<Step, string> = {
  name: "Create a Slack Bot",
  "signing-secret": "Signing Secret",
  "bot-token": "Bot Token",
  "event-subscriptions": "Event Subscriptions",
  setup: "Invite Bot",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  name: "Choose a display name to identify this Slack bot in Dafthunk.",
  "signing-secret":
    "Copy the Signing Secret from the Basic Information page of your Slack app.",
  "bot-token":
    "Copy the Bot User OAuth Token from the OAuth & Permissions page of your Slack app.",
  "event-subscriptions":
    "Copy the webhook URL below and paste it as the Request URL in the Event Subscriptions page of your Slack app.",
  setup:
    "Verify permissions, invite the bot to a channel, and create a workflow.",
};

const SLACK_API_URL = "https://api.slack.com/apps";

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
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [botToken, setBotToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [createdTeamName, setCreatedTeamName] = useState<string | null>(null);

  const resetForm = () => {
    setStep("name");
    setName("");
    setSigningSecret("");
    setBotToken("");
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
      setStep("event-subscriptions");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const webhookUrl = createdBotId
    ? `${getApiBaseUrl().replace(/\/$/, "")}/slack/webhook/${createdBotId}`
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
            {(step === "signing-secret" ||
              step === "bot-token" ||
              step === "event-subscriptions") && (
              <>
                {" "}
                <a
                  href={SLACK_API_URL}
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

        {step === "name" && (
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
                A display name for this bot in Dafthunk. This is not visible to
                your Slack users.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("signing-secret")}
                disabled={name.trim() === ""}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "signing-secret" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="slack-signing-secret">Signing Secret</Label>
              <Input
                id="slack-signing-secret"
                type="password"
                value={signingSecret}
                onChange={(e) => setSigningSecret(e.target.value)}
                placeholder="Paste your signing secret here"
              />
              <p className="text-xs text-muted-foreground">
                Find this under{" "}
                <span className="font-medium text-foreground">
                  Basic Information
                </span>{" "}
                in your Slack app settings. Used to verify that incoming webhook
                messages are genuinely from Slack.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("name")}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("bot-token")}
                disabled={signingSecret.trim() === ""}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "bot-token" && (
          <div className="space-y-3">
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
                Find this under{" "}
                <span className="font-medium text-foreground">
                  OAuth &amp; Permissions
                </span>{" "}
                in your Slack app settings.
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
                  setStep("signing-secret");
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
                    Connecting...
                  </>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "event-subscriptions" && (
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

            <div className="space-y-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Request URL</p>
                <CopyableValue value={webhookUrl} />
              </div>

              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5 mt-3">
                <li>
                  Go to{" "}
                  <span className="font-medium text-foreground">
                    Event Subscriptions
                  </span>{" "}
                  and toggle{" "}
                  <span className="font-medium text-foreground">
                    Enable Events
                  </span>{" "}
                  to On.
                </li>
                <li>
                  Paste the Request URL above and wait for Slack to verify it.
                </li>
                <li>
                  Under{" "}
                  <span className="font-medium text-foreground">
                    Subscribe to bot events
                  </span>
                  , add <span className="font-mono">message.channels</span> and{" "}
                  <span className="font-mono">message.groups</span>, then save.
                </li>
              </ol>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep("setup")}>Next</Button>
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1.5">
              <li>
                Under{" "}
                <a
                  href={SLACK_API_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  OAuth &amp; Permissions
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                , verify the bot has{" "}
                <span className="font-mono">channels:history</span>,{" "}
                <span className="font-mono">groups:history</span>, and{" "}
                <span className="font-mono">chat:write</span> scopes.
              </li>
              <li>
                Invite the bot to a channel with{" "}
                <span className="font-mono">/invite @{name || "botname"}</span>.
              </li>
              <li>
                Create a workflow with a{" "}
                <span className="font-medium text-foreground">
                  Receive Slack Message
                </span>{" "}
                trigger and select this bot.
              </li>
            </ol>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("event-subscriptions")}
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
