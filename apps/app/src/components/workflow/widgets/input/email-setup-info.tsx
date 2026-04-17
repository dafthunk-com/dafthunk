import { CopyableValue } from "./copyable-value";

interface EmailSetupInfoProps {
  emailId: string;
}

export function EmailSetupInfo({ emailId }: EmailSetupInfoProps) {
  const domain = import.meta.env.VITE_EMAIL_DOMAIN || "mail.dafthunk.com";
  const emailAddress = `${emailId}@${domain}`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Email Address</p>
        <CopyableValue value={emailAddress} />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">Receive Email</span>{" "}
            trigger and select this email.
          </li>
          <li>Enable the workflow.</li>
          <li>Send an email to the address above to trigger the workflow.</li>
        </ol>
      </div>
    </div>
  );
}
