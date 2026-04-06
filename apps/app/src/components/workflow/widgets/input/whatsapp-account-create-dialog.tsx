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

type Step = "name" | "app-secret" | "api-credentials" | "setup";

const STEP_TITLES: Record<Step, string> = {
  name: "Add WhatsApp Account",
  "app-secret": "App Secret",
  "api-credentials": "WhatsApp API Credentials",
  setup: "Account Created",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  name: "Choose a display name to identify this WhatsApp account in Dafthunk.",
  "app-secret":
    "Copy the App Secret from your Meta app. Navigate to Apps > App Settings > Basic in the Meta Developer Portal.",
  "api-credentials":
    "Copy your Access Token and Phone Number ID from the WhatsApp API Setup page in the Meta Developer Portal.",
  setup: "Your account is ready. Follow these steps to complete the setup.",
};

const META_PORTAL_URL = "https://developers.facebook.com/apps/";

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
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep("name");
    setName("");
    setAppSecret("");
    setAccessToken("");
    setPhoneNumberId("");
    setWabaId("");
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
            {(step === "app-secret" || step === "api-credentials") && (
              <>
                {" "}
                <a
                  href={META_PORTAL_URL}
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

        {step === "name" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-name">Name</Label>
              <Input
                id="whatsapp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My WhatsApp Bot"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this account in Dafthunk. This is not visible
                to your WhatsApp users.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("app-secret")}
                disabled={name.trim() === ""}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "app-secret" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-app-secret">App Secret</Label>
              <Input
                id="whatsapp-app-secret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="Paste your App Secret here"
              />
              <p className="text-xs text-muted-foreground">
                Find this at{" "}
                <span className="font-medium text-foreground">
                  Apps &gt; App Settings &gt; Basic
                </span>{" "}
                in the Meta Developer Portal. Click{" "}
                <span className="font-medium text-foreground">Show</span> next
                to the App Secret field. Used to verify that incoming webhook
                messages are genuinely from Meta.
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
                onClick={() => setStep("api-credentials")}
                disabled={appSecret.trim() === ""}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === "api-credentials" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-token">Access Token</Label>
              <Input
                id="whatsapp-token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token here"
              />
              <p className="text-xs text-muted-foreground">
                Find this at{" "}
                <span className="font-medium text-foreground">
                  Apps &gt; Use cases &gt; WhatsApp &gt; API Setup
                </span>{" "}
                under the temporary access token section, or generate a
                permanent token via{" "}
                <span className="font-medium text-foreground">
                  Business &gt; Settings &gt; System Users
                </span>
                .
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                Temporary tokens from API Setup expire in 24 hours. For
                production use, generate a permanent token from a System User in
                Business Settings.
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
                Find this at{" "}
                <span className="font-medium text-foreground">
                  Apps &gt; Use cases &gt; WhatsApp &gt; API Setup
                </span>
                . Select your phone number from the dropdown — the numeric ID
                appears below it. This is not the phone number itself.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-waba-id">
                WABA ID{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="whatsapp-waba-id"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="WhatsApp Business Account ID"
              />
              <p className="text-xs text-muted-foreground">
                The WhatsApp Business Account ID, found on the same page. Stored
                for reference only.
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
                  setStep("app-secret");
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  accessToken.trim() === "" ||
                  phoneNumberId.trim() === ""
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
