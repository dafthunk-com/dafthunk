interface WhatsAppSetupInfoProps {
  phoneNumberId: string | null;
}

export function WhatsAppSetupInfo({ phoneNumberId }: WhatsAppSetupInfoProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">
              Receive WhatsApp Message
            </span>{" "}
            trigger and select this account.
          </li>
          <li>
            Configure the webhook URL in your{" "}
            <span className="font-medium text-foreground">
              Meta Developer Portal
            </span>
            . Use the webhook URL shown in the account details.
          </li>
          <li>
            Enable the workflow, then send a message to{" "}
            {phoneNumberId ? (
              <span className="font-medium text-foreground font-mono">
                {phoneNumberId}
              </span>
            ) : (
              "your WhatsApp number"
            )}{" "}
            to trigger the workflow.
          </li>
        </ol>
      </div>
    </div>
  );
}
