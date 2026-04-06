export function WhatsAppSetupInfo() {
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
            After creating the workflow, the{" "}
            <span className="font-medium text-foreground">Callback URL</span>{" "}
            and{" "}
            <span className="font-medium text-foreground">Verify Token</span>{" "}
            will appear on the account details page. Copy them into the{" "}
            <span className="font-medium text-foreground">
              Meta Developer Portal
            </span>{" "}
            webhook settings and subscribe to the{" "}
            <span className="font-medium text-foreground">messages</span>{" "}
            field.
          </li>
          <li>
            Enable the workflow, then send a WhatsApp message to your business
            number to trigger it.
          </li>
        </ol>
      </div>
    </div>
  );
}
