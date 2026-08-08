import type { BriefDestination, IntegrationProvider } from "@dafthunk/types";
import Link2 from "lucide-react/icons/link-2";
import { useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import {
  getProviderLabel,
  rememberOAuthReturn,
  useIntegrationActions,
} from "@/integrations";

/**
 * The one thing standing between this sentence and a result.
 *
 * Asked in place, at the step that needs it, and only once the user has said
 * something that needs it — never as a gate before anyone knows why it
 * matters. Someone who has just written "post my updates to Discord" knows
 * exactly why Discord is being asked for; the same request on a signup form
 * is an obstacle.
 *
 * The session id is already in the URL and the brief lives on the server, so
 * leaving for OAuth and coming back lands on the same sentence.
 */
export interface ConnectCardProps {
  destination: BriefDestination;
}

export function ConnectCard({ destination }: ConnectCardProps) {
  const { connectOAuth } = useIntegrationActions();
  const location = useLocation();

  if (!destination.provider) return null;
  const provider = destination.provider as IntegrationProvider;
  const label = getProviderLabel(provider);

  return (
    <div className="animate-in fade-in-0 slide-in-from-top-1 space-y-3 rounded-lg border bg-card p-4 duration-200 motion-reduce:animate-none">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">This needs your {label} account</p>
          <p className="text-sm text-muted-foreground">
            Link it once and I'll carry on from here — you'll come straight back
            to this sentence.
          </p>
        </div>
      </div>

      <Button
        onClick={() => {
          rememberOAuthReturn(`${location.pathname}${location.search}`);
          connectOAuth(provider);
        }}
      >
        Connect {label}
      </Button>
    </div>
  );
}
