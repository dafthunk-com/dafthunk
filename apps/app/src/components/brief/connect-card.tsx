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
 * The account link, asked for in place.
 *
 * Asked at the step that needs it, and only once the user has said something
 * that needs it — never as a gate before anyone knows why it matters. Someone
 * who has just written "post my updates to Discord" knows exactly why Discord
 * is being asked for; the same request on a signup form is an obstacle.
 *
 * The session id is already in the URL, so leaving for OAuth and coming back
 * lands on the same screen — sentence or outcome alike.
 */
export interface ConnectProviderCardProps {
  provider: string;
  title?: string;
  description?: string;
  /** The button text; defaults to "Connect {label}". */
  cta?: string;
}

export function ConnectProviderCard({
  provider,
  title,
  description,
  cta,
}: ConnectProviderCardProps) {
  const { connectOAuth } = useIntegrationActions();
  const location = useLocation();

  const typed = provider as IntegrationProvider;
  const label = getProviderLabel(typed);

  return (
    <div className="animate-in fade-in-0 slide-in-from-top-1 space-y-3 rounded-lg border bg-card p-4 duration-200 motion-reduce:animate-none">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {title ?? `This needs your ${label} account`}
          </p>
          <p className="text-sm text-muted-foreground">
            {description ??
              "Link it once and I'll carry on from here — you'll come straight back."}
          </p>
        </div>
      </div>

      <Button
        onClick={() => {
          rememberOAuthReturn(`${location.pathname}${location.search}`);
          connectOAuth(typed);
        }}
      >
        {cta ?? `Connect ${label}`}
      </Button>
    </div>
  );
}

/** The brief page's variant, still keyed off the chosen destination. */
export interface ConnectCardProps {
  destination: BriefDestination;
}

export function ConnectCard({ destination }: ConnectCardProps) {
  if (!destination.provider) return null;
  const label = getProviderLabel(destination.provider as IntegrationProvider);

  return (
    <ConnectProviderCard
      provider={destination.provider}
      title={`This wants your ${label} account`}
      // The build no longer waits for the link: the trial rehearses those
      // steps either way, so connecting now is a head start, not a gate.
      description={`Link it now and the workflow arrives wired to your account — or build first and connect after; the trial is safe either way.`}
    />
  );
}
