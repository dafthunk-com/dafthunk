import Copy from "lucide-react/icons/copy";
import ExternalLink from "lucide-react/icons/external-link";
import Pencil from "lucide-react/icons/pencil";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  useWhatsAppAccount,
  useWhatsAppWebhookInfo,
} from "@/services/whatsapp-account-service";

import { BotWhatsAppEditDialog } from "./bot-whatsapp-edit-dialog";

export function BotWhatsAppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();

  const {
    whatsappAccount,
    whatsappAccountError,
    isWhatsAppAccountLoading,
    mutateWhatsAppAccount,
  } = useWhatsAppAccount(id || null);
  const { webhookInfo } = useWhatsAppWebhookInfo(id || null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  useEffect(() => {
    setBreadcrumbs([
      { label: "Bots", to: getOrgUrl("bots") },
      { label: whatsappAccount?.name || id || "" },
    ]);
  }, [id, whatsappAccount?.name, setBreadcrumbs, getOrgUrl]);

  if (isWhatsAppAccountLoading) {
    return <InsetLoading title="Account Details" />;
  } else if (whatsappAccountError) {
    return (
      <InsetError
        title="Account Details"
        errorMessage={whatsappAccountError.message}
      />
    );
  } else if (!whatsappAccount) {
    return (
      <InsetError title="Account Details" errorMessage="Account not found" />
    );
  }

  return (
    <InsetLayout title="Account Details">
      <div className="space-y-8">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="space-y-4">
          <DetailRow
            label="Name"
            value={whatsappAccount.name || "Untitled Account"}
          />
          <DetailRow
            label="Phone Number ID"
            value={whatsappAccount.phoneNumberId}
            mono
          />
          <DetailRow
            label="WABA ID"
            value={whatsappAccount.wabaId || "---"}
            mono
          />
          <DetailRow
            label="Access Token"
            value={`****${whatsappAccount.tokenLastFour}`}
            mono
          />
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Webhook Configuration</h3>
          {webhookInfo?.verifyToken ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Copy these values into your{" "}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Meta Developer Portal
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                webhook settings.
              </p>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                <span className="text-sm font-medium text-muted-foreground">
                  Callback URL
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono break-all">
                    {webhookInfo.webhookUrl}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() =>
                      copyToClipboard(webhookInfo.webhookUrl!, "Callback URL")
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Verify Token
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono break-all">
                    {webhookInfo.verifyToken}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() =>
                      copyToClipboard(webhookInfo.verifyToken!, "Verify Token")
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a workflow with a{" "}
              <span className="font-medium text-foreground">
                Receive WhatsApp Message
              </span>{" "}
              trigger to generate webhook configuration.
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Create a workflow with a{" "}
              <span className="font-medium text-foreground">
                Receive WhatsApp Message
              </span>{" "}
              trigger node and select this account.
            </li>
            <li>
              Copy the{" "}
              <span className="font-medium text-foreground">Callback URL</span>{" "}
              and{" "}
              <span className="font-medium text-foreground">Verify Token</span>{" "}
              above into the{" "}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Meta Developer Portal
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              webhook settings. Subscribe to the{" "}
              <span className="font-medium text-foreground">messages</span>{" "}
              field.
            </li>
            <li>
              Enable the workflow, then send a WhatsApp message to your business
              number to trigger it.
            </li>
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Links</h3>
          <div className="flex flex-col gap-2">
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Meta Developer Portal
            </a>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              WhatsApp Cloud API Documentation
            </a>
          </div>
        </div>
      </div>
      <BotWhatsAppEditDialog
        account={whatsappAccount}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onUpdated={() => mutateWhatsAppAccount()}
      />
    </InsetLayout>
  );
}
