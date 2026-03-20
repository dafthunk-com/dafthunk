import type { GetWhatsAppAccountResponse } from "@dafthunk/types";
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
import { updateWhatsAppAccount } from "@/services/whatsapp-account-service";

interface BotWhatsAppEditDialogProps {
  account: GetWhatsAppAccountResponse;
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
  const [name, setName] = useState(account.name);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(account.phoneNumberId);
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
            phoneNumberId !== account.phoneNumberId ? phoneNumberId : undefined,
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
      setPhoneNumberId(account.phoneNumberId);
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone-number-id">Phone Number ID</Label>
            <Input
              id="edit-phone-number-id"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
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
