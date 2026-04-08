import type { BotResponse } from "@dafthunk/types";
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
import { updateWhatsAppAccount } from "@/services/bot-service";

interface BotWhatsAppEditDialogProps {
  account: BotResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function BotWhatsAppEditDialog({
  account,
  open,
  onOpenChange,
  onUpdated,
}: BotWhatsAppEditDialogProps) {
  const { organization } = useAuth();
  const meta = (account.metadata ?? {}) as Record<string, string | undefined>;
  const [name, setName] = useState(account.name);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(meta.phoneNumberId ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [wabaId, setWabaId] = useState(meta.wabaId ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!organization?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateWhatsAppAccount(
        account.id,
        {
          name: name !== account.name ? name : undefined,
          accessToken: accessToken.trim() !== "" ? accessToken : undefined,
          phoneNumberId:
            phoneNumberId !== meta.phoneNumberId ? phoneNumberId : undefined,
          appSecret: appSecret.trim() !== "" ? appSecret : undefined,
          wabaId:
            wabaId !== (meta.wabaId || "") ? wabaId || undefined : undefined,
        },
        organization.id
      );
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setName(account.name);
      setAccessToken("");
      setPhoneNumberId(meta.phoneNumberId ?? "");
      setAppSecret("");
      setWabaId(meta.wabaId || "");
      setError(null);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Account</DialogTitle>
          <DialogDescription>
            Update your WhatsApp Business API settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A display name for this account in Dafthunk.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-app-secret">App Secret</Label>
            <Input
              id="edit-app-secret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="Leave empty to keep current secret"
            />
            <p className="text-xs text-muted-foreground">
              Found at Apps &gt; App Settings &gt; Basic in the Meta Developer
              Portal.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-access-token">Access Token</Label>
            <Input
              id="edit-access-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Leave empty to keep current token"
            />
            <p className="text-xs text-muted-foreground">
              Found at Apps &gt; Use cases &gt; WhatsApp &gt; API Setup, or via
              Business Settings &gt; System Users for a permanent token.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone-number-id">Phone Number ID</Label>
            <Input
              id="edit-phone-number-id"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Found at Apps &gt; Use cases &gt; WhatsApp &gt; API Setup under
              the phone number dropdown.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-waba-id">
              WABA ID{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-waba-id"
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || name.trim() === ""}
          >
            {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
