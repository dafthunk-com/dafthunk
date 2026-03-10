import { CopyableValue } from "./copyable-value";

interface EmailSetupInfoProps {
  handle: string;
  orgHandle: string;
  isDeployed?: boolean;
}

export function EmailSetupInfo({
  handle,
  orgHandle,
  isDeployed,
}: EmailSetupInfoProps) {
  const prodAddress = `${orgHandle}+${handle}@dafthunk.com`;
  const devAddress = `${orgHandle}+${handle}+dev@dafthunk.com`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Email Addresses</p>
        <div className="space-y-1.5">
          <CopyableValue label="Development" value={devAddress} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Production</p>
              {isDeployed !== undefined &&
                (isDeployed ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                    Deployed
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-medium">
                    Not Deployed
                  </span>
                ))}
            </div>
            <CopyableValue value={prodAddress} />
          </div>
        </div>
      </div>
      {isDeployed !== undefined && (
        <p className="text-xs text-muted-foreground">
          {isDeployed
            ? "Production triggers the deployed version. Development triggers the working version."
            : "Production requires deployment. Use development to test."}
        </p>
      )}
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">Receive Email</span>{" "}
            trigger and select this inbox.
          </li>
          <li>Deploy the workflow.</li>
          <li>Send an email to the address above to trigger the workflow.</li>
        </ol>
      </div>
    </div>
  );
}
