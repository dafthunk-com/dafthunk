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
import { createWhatsAppAccount } from "@/services/whatsapp-account-service";

import { WhatsAppSetupInfo } from "./whatsapp-setup-info";

type Step = "credentials" | "setup";

const STEP_TITLES: Record<Step, string> = {
  credentials: "Add WhatsApp Account",
  setup: "Account Created",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  credentials:
    "Enter your WhatsApp Business API credentials from the Meta Developer Portal.",
  setup:
    "Your account is ready. Configure the webhook URL in the Meta Developer Portal.",
};

interface WhatsAppAccountCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (accountId: string) => void;
}

export function WhatsAppAccountCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: WhatsAppAccountCreateDialogProps) {
  const { organization } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep("credentials");
    setName("");
    setAccessToken("");
    setPhoneNumberId("");
    setWabaId("");
    setAppSecret("");
    setError(null);
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
      const response = await createWhatsAppAccount(
        {
          name,
          accessToken,
          phoneNumberId,
          wabaId: wabaId || undefined,
          appSecret,
        },
        organization.id
      );
      setStep("setup");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
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
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Open Meta Developer Portal
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            )}
          </DialogDescription>
        </div>

        {step === "credentials" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-name">Name</Label>
              <Input
                id="whatsapp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My WhatsApp Account"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this account in Dafthunk.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-token">Access Token</Label>
              <Input
                id="whatsapp-token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Your WhatsApp Business API access token from the Meta Developer
                Portal.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-phone-number-id">Phone Number ID</Label>
              <Input
                id="whatsapp-phone-number-id"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                The Phone Number ID from your WhatsApp Business account.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-waba-id">
                WABA ID{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="whatsapp-waba-id"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="WhatsApp Business Account ID"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-app-secret">App Secret</Label>
              <Input
                id="whatsapp-app-secret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Required to verify incoming webhook signatures. Find it in App
                Settings &gt; Basic in the Meta Developer Portal.
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
                  accessToken.trim() === "" ||
                  phoneNumberId.trim() === "" ||
                  appSecret.trim() === ""
                }
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
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
              <span className="font-medium">{name}</span>
            </div>

            <WhatsAppSetupInfo />

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
