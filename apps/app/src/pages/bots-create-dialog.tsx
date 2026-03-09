import Bot from "lucide-react/icons/bot";
import ChevronLeft from "lucide-react/icons/chevron-left";
import Send from "lucide-react/icons/send";
import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createDiscordBot } from "@/services/discord-bot-service";
import { createTelegramBot } from "@/services/telegram-bot-service";

type Step =
  | "choose-type"
  | "discord-form"
  | "telegram-form";

const STEP_TITLES: Record<Step, string> = {
  "choose-type": "Add Bot",
  "discord-form": "Add Discord Bot",
  "telegram-form": "Add Telegram Bot",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  "choose-type": "Choose the platform for your bot.",
  "discord-form": "Enter your Discord bot credentials.",
  "telegram-form": "Enter your Telegram bot credentials.",
};

interface BotsCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function BotsCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: BotsCreateDialogProps) {
  const [step, setStep] = useState<Step>("choose-type");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setStep("choose-type");
      setCreateError(null);
    }
    onOpenChange(value);
  };

  const handleCreateDiscordBot = async (formData: FormData) => {
    if (!orgHandle) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createDiscordBot(
        {
          name: formData.get("name") as string,
          botToken: formData.get("botToken") as string,
          applicationId: formData.get("applicationId") as string,
          publicKey: formData.get("publicKey") as string,
        },
        orgHandle
      );
      onCreated();
      handleOpenChange(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create bot"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTelegramBot = async (formData: FormData) => {
    if (!orgHandle) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await createTelegramBot(
        {
          name: formData.get("name") as string,
          botToken: formData.get("botToken") as string,
        },
        orgHandle
      );
      onCreated();
      handleOpenChange(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create bot"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
          <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        {step === "choose-type" && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              type="button"
              onClick={() => setStep("discord-form")}
              className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
            >
              <Bot className="h-8 w-8" />
              <span className="font-medium">Discord</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("telegram-form")}
              className="flex flex-col items-center gap-3 rounded-lg border p-6 hover:border-primary hover:bg-accent transition-colors"
            >
              <Send className="h-8 w-8" />
              <span className="font-medium">Telegram</span>
            </button>
          </div>
        )}

        {step === "discord-form" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleCreateDiscordBot(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Bot Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Discord Bot"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="applicationId">Application ID</Label>
              <Input
                id="applicationId"
                name="applicationId"
                placeholder="e.g. 123456789012345678"
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your application's General Information page on the
                Discord Developer Portal.
              </p>
            </div>
            <div>
              <Label htmlFor="publicKey">Public Key</Label>
              <Input
                id="publicKey"
                name="publicKey"
                placeholder="Enter your application's public key"
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your application's General Information page on the
                Discord Developer Portal. Used to verify interaction signatures.
              </p>
            </div>
            <div>
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                name="botToken"
                type="password"
                placeholder="Enter your Discord bot token"
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find this in the Discord Developer Portal under your
                application's Bot settings.
              </p>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setStep("choose-type");
                  setCreateError(null);
                }}
                disabled={isCreating}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Add Bot
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "telegram-form" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleCreateTelegramBot(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Bot Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Telegram Bot"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                name="botToken"
                type="password"
                placeholder="Enter your Telegram bot token"
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get this from @BotFather on Telegram.
              </p>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setStep("choose-type");
                  setCreateError(null);
                }}
                disabled={isCreating}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Add Bot
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
