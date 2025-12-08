import { format } from "date-fns";
import CreditCard from "lucide-react/icons/credit-card";
import ExternalLink from "lucide-react/icons/external-link";
import Sparkles from "lucide-react/icons/sparkles";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createBillingPortal,
  createCheckoutSession,
  useBilling,
} from "@/services/billing-service";

export function BillingPage() {
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { billing, billingError, isBillingLoading, mutateBilling } =
    useBilling();
  const { organization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Billing" }]);
  }, [setBreadcrumbs]);

  // Refetch billing data when returning from Stripe checkout
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      mutateBilling();
      setSearchParams({}, { replace: true });
      toast.success("Subscription activated! Welcome to Pro.");
    }
  }, [searchParams, setSearchParams, mutateBilling]);

  const handleUpgrade = useCallback(async () => {
    if (!organization?.handle) return;

    setIsUpgrading(true);
    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const successUrl = `${baseUrl}?checkout=success`;
      const cancelUrl = baseUrl;
      const checkoutUrl = await createCheckoutSession(
        organization.handle,
        successUrl,
        cancelUrl
      );
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error("Failed to start checkout. Please try again.");
      console.error("Checkout error:", error);
      setIsUpgrading(false);
    }
  }, [organization?.handle]);

  const handleManageSubscription = useCallback(async () => {
    if (!organization?.handle) return;

    setIsOpeningPortal(true);
    try {
      const returnUrl = window.location.href;
      const portalUrl = await createBillingPortal(
        organization.handle,
        returnUrl
      );
      window.location.href = portalUrl;
    } catch (error) {
      toast.error("Failed to open billing portal. Please try again.");
      console.error("Portal error:", error);
      setIsOpeningPortal(false);
    }
  }, [organization?.handle]);

  if (isBillingLoading && !billing) {
    return <InsetLoading title="Billing" />;
  }

  if (billingError) {
    return <InsetError title="Billing" errorMessage={billingError.message} />;
  }

  const isPro = billing?.plan === "pro";
  const isCanceled = billing?.subscriptionStatus === "canceled";
  const isActive = billing?.subscriptionStatus === "active";
  const usagePercent = billing?.includedCredits
    ? Math.min(100, (billing.usageThisPeriod / billing.includedCredits) * 100)
    : 0;

  // Helper to get plan description
  const getPlanDescription = () => {
    if (isPro && isCanceled) {
      return "Your subscription has been canceled but you have access until the end of your billing period";
    }
    if (isPro && isActive) {
      return "$10/month base + pay-as-you-go for usage beyond included credits";
    }
    return "Upgrade to Pro for included monthly credits and usage-based billing";
  };

  // Helper to get status line
  const getStatusLine = () => {
    if (!billing?.currentPeriodEnd) return null;
    const endDate = format(new Date(billing.currentPeriodEnd), "MMMM d, yyyy");

    if (isCanceled) {
      return `Access ends ${endDate}`;
    }
    if (isActive) {
      return `Renews ${endDate}`;
    }
    return null;
  };

  return (
    <InsetLayout title="Billing">
      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge variant={isPro ? "default" : "secondary"}>
                    {isPro ? "Pro" : "Trial"}
                  </Badge>
                  {isCanceled && <Badge variant="destructive">Canceled</Badge>}
                </CardTitle>
                <CardDescription>{getPlanDescription()}</CardDescription>
                {getStatusLine() && (
                  <p className="text-sm text-muted-foreground">
                    {getStatusLine()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {/* Show Manage button for active Pro users */}
                {isPro && isActive && (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={isOpeningPortal}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isOpeningPortal ? "Opening..." : "Manage Subscription"}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                )}
                {/* Show Resubscribe for canceled Pro users */}
                {isPro && isCanceled && (
                  <Button onClick={handleUpgrade} disabled={isUpgrading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isUpgrading ? "Redirecting..." : "Resubscribe"}
                  </Button>
                )}
                {/* Show Upgrade for Trial users */}
                {!isPro && (
                  <Button onClick={handleUpgrade} disabled={isUpgrading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isUpgrading ? "Redirecting..." : "Upgrade to Pro"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Usage - shown for Pro users (active or canceled with access) */}
        {isPro && (
          <Card>
            <CardHeader>
              <CardTitle>Usage This Period</CardTitle>
              <CardDescription>
                {billing?.currentPeriodStart && billing?.currentPeriodEnd && (
                  <>
                    {format(new Date(billing.currentPeriodStart), "MMM d")} –{" "}
                    {format(new Date(billing.currentPeriodEnd), "MMM d, yyyy")}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Compute Credits</span>
                  <span>
                    {billing?.usageThisPeriod?.toLocaleString() ?? 0} /{" "}
                    {billing?.includedCredits?.toLocaleString() ?? 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
              {billing?.usageThisPeriod !== undefined &&
                billing?.includedCredits !== undefined &&
                billing.usageThisPeriod > billing.includedCredits && (
                  <p className="text-sm text-muted-foreground">
                    Overage:{" "}
                    {(
                      billing.usageThisPeriod - billing.includedCredits
                    ).toLocaleString()}{" "}
                    credits
                  </p>
                )}
            </CardContent>
          </Card>
        )}

        {/* Pro Features - shown for Trial users */}
        {!isPro && (
          <Card>
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
              <CardDescription>
                $10/month base subscription with usage-based billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">
                      Included monthly credits
                    </span>
                    <p className="text-muted-foreground">
                      Get a monthly allowance of compute credits with your
                      subscription
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Pay-as-you-go overage</span>
                    <p className="text-muted-foreground">
                      Only pay for additional usage beyond your included credits
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Priority support</span>
                    <p className="text-muted-foreground">
                      Get faster responses from our support team
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </InsetLayout>
  );
}
