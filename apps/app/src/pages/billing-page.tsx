import { format } from "date-fns";
import CreditCard from "lucide-react/icons/credit-card";
import ExternalLink from "lucide-react/icons/external-link";
import Pencil from "lucide-react/icons/pencil";
import Sparkles from "lucide-react/icons/sparkles";
import X from "lucide-react/icons/x";
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
import { Input } from "@/components/ui/input";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createBillingPortal,
  createCheckoutSession,
  updateOverageLimit,
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
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [isSavingLimit, setIsSavingLimit] = useState(false);

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

  const handleStartEditLimit = useCallback(() => {
    setLimitInput(billing?.overageLimit?.toString() ?? "");
    setIsEditingLimit(true);
  }, [billing?.overageLimit]);

  const handleCancelEditLimit = useCallback(() => {
    setIsEditingLimit(false);
    setLimitInput("");
  }, []);

  const handleSaveLimit = useCallback(async () => {
    if (!organization?.handle) return;

    setIsSavingLimit(true);
    try {
      const newLimit = limitInput.trim() === "" ? null : parseInt(limitInput);
      if (newLimit !== null && (isNaN(newLimit) || newLimit < 0)) {
        toast.error("Please enter a valid number (0 or greater)");
        setIsSavingLimit(false);
        return;
      }
      await updateOverageLimit(organization.handle, newLimit);
      await mutateBilling();
      setIsEditingLimit(false);
      toast.success(
        newLimit === null
          ? "Additional usage limit removed"
          : `Additional usage limit set to ${newLimit.toLocaleString()}`
      );
    } catch (error) {
      toast.error("Failed to update limit. Please try again.");
      console.error("Update limit error:", error);
    } finally {
      setIsSavingLimit(false);
    }
  }, [organization?.handle, limitInput, mutateBilling]);

  const handleRemoveLimit = useCallback(async () => {
    if (!organization?.handle) return;

    setIsSavingLimit(true);
    try {
      await updateOverageLimit(organization.handle, null);
      await mutateBilling();
      setIsEditingLimit(false);
      toast.success("Additional usage limit removed");
    } catch (error) {
      toast.error("Failed to remove limit. Please try again.");
      console.error("Remove limit error:", error);
    } finally {
      setIsSavingLimit(false);
    }
  }, [organization?.handle, mutateBilling]);

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
  const hasOverageLimit = billing?.overageLimit != null;
  const currentOverage = Math.max(
    0,
    (billing?.usageThisPeriod ?? 0) - (billing?.includedCredits ?? 0)
  );
  const isOverageAtLimit =
    hasOverageLimit && currentOverage >= billing!.overageLimit!;

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
              <CardTitle>Usage</CardTitle>
              <CardDescription>
                {billing?.currentPeriodStart && billing?.currentPeriodEnd && (
                  <>
                    {format(new Date(billing.currentPeriodStart), "MMM d")} –{" "}
                    {format(new Date(billing.currentPeriodEnd), "MMM d, yyyy")}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Included Usage Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Included Usage</span>
                  <span>
                    {Math.min(
                      billing?.usageThisPeriod ?? 0,
                      billing?.includedCredits ?? 0
                    ).toLocaleString()}{" "}
                    / {billing?.includedCredits?.toLocaleString() ?? 0}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all rounded-full"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {usagePercent < 100
                    ? `${((billing?.includedCredits ?? 0) - (billing?.usageThisPeriod ?? 0)).toLocaleString()} remaining`
                    : "Included usage exhausted"}
                </p>
              </div>

              {/* Overage Section */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Additional Usage</span>
                  <span>
                    {currentOverage.toLocaleString()}
                    {hasOverageLimit &&
                      ` / ${billing!.overageLimit!.toLocaleString()}`}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  {currentOverage > 0 && (
                    <div
                      className={`h-full transition-all rounded-full ${isOverageAtLimit ? "bg-red-500" : "bg-orange-500"}`}
                      style={{
                        width: hasOverageLimit
                          ? `${Math.min(100, (currentOverage / billing!.overageLimit!) * 100)}%`
                          : `${Math.min(100, (currentOverage / (billing?.includedCredits ?? 1)) * 100)}%`,
                      }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentOverage > 0
                    ? isOverageAtLimit
                      ? "Limit reached - executions will be blocked"
                      : "Billed at the end of your billing period"
                    : "No overage charges yet"}
                </p>
              </div>

              {/* Overage Limit Setting */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Additional Usage Limit
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasOverageLimit
                        ? `Limit set to ${billing!.overageLimit!.toLocaleString()} credits`
                        : "No limit set - unlimited additional usage"}
                    </p>
                  </div>
                  {isEditingLimit ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="No limit"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        className="w-32 h-8"
                        disabled={isSavingLimit}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveLimit}
                        disabled={isSavingLimit}
                      >
                        {isSavingLimit ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditLimit}
                        disabled={isSavingLimit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {hasOverageLimit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRemoveLimit}
                          disabled={isSavingLimit}
                        >
                          Remove Limit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleStartEditLimit}
                        disabled={isSavingLimit}
                      >
                        <Pencil className="mr-2 h-3 w-3" />
                        {hasOverageLimit ? "Change" : "Set Limit"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
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
                    <span className="font-medium">Included monthly usage</span>
                    <p className="text-muted-foreground">
                      Get a monthly allowance of compute usage with your
                      subscription
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Pay-as-you-go overage</span>
                    <p className="text-muted-foreground">
                      Only pay for additional usage beyond your included
                      allowance
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
