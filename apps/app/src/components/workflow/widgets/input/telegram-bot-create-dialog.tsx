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
import { createTelegramBot } from "@/services/bot-service";

import { TelegramBotSetupInfo } from "./telegram-setup-info";

type Step = "credentials" | "setup";

const STEP_TITLES: Record<Step, string> = {
  credentials: "Create a Telegram Bot",
  setup: "Bot Created",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  credentials:
    "Create a new bot with @BotFather on Telegram, then copy the bot token it gives you.",
  setup:
    "Your bot is ready. The webhook will be auto-registered when you enable the workflow.",
};

interface TelegramBotCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (botId: string) => void;
}

export function TelegramBotCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: TelegramBotCreateDialogProps) {
  const { organization } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBotUsername, setCreatedBotUsername] = useState<string | null>(
    null
  );

  const resetForm = () => {
    setStep("credentials");
    setName("");
    setBotToken("");
    setError(null);
    setCreatedBotUsername(null);
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
      const response = await createTelegramBot(
        { name, botToken },
        organization.id
      );
      setCreatedBotUsername(
        (response.metadata as Record<string, string | undefined> | null)
          ?.botUsername ?? null
      );
      setStep("setup");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Open @BotFather
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            )}
          </DialogDescription>
        </div>

        {step === "credentials" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="telegram-name">Name</Label>
              <Input
                id="telegram-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Telegram Bot"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this bot in Dafthunk.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telegram-token">Bot Token</Label>
              <Input
                id="telegram-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Copy the token from{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  @BotFather
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                on Telegram. Use /newbot to create one if needed.
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
                  isSubmitting || name.trim() === "" || botToken.trim() === ""
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
                {createdBotUsername && (
                  <span className="text-muted-foreground">
                    {" "}
                    (@{createdBotUsername})
                  </span>
                )}
              </span>
            </div>

            <TelegramBotSetupInfo botUsername={createdBotUsername} />

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
