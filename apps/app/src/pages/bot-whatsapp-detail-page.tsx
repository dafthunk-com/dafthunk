import ExternalLink from "lucide-react/icons/external-link";
import Pencil from "lucide-react/icons/pencil";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useWhatsAppAccount } from "@/services/whatsapp-account-service";

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
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      <div className="space-y-8 max-w-2xl">
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
            label="Token"
            value={`****${whatsappAccount.tokenLastFour}`}
            mono
          />
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
              In the{" "}
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Meta Developer Portal
                <ExternalLink className="h-3 w-3" />
              </a>
              , configure the webhook URL and verify token shown in your
              workflow settings.
            </li>
            <li>
              Enable the workflow, then send a WhatsApp message to your business
              number to trigger it.
            </li>
          </ol>
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
