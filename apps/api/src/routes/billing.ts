import type {
  CreateBillingPortalResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  GetBillingResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { createDatabase, organizations } from "../db";
import { createStripeService } from "../services/stripe-service";

const billing = new Hono<ApiContext>();

billing.use("*", jwtMiddleware);

/**
 * GET /billing
 *
 * Get billing information for the current organization
 */
billing.get("/", async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return c.json({ error: "Organization not found" }, 404);
  }

  // Query current period usage from Analytics Engine
  let usageThisPeriod = 0;
  const stripeService = createStripeService(c.env);

  // Only query usage if we have valid billing period dates and Analytics Engine is configured
  const periodStart = org.currentPeriodStart
    ? new Date(org.currentPeriodStart)
    : null;
  const periodEnd = org.currentPeriodEnd
    ? new Date(org.currentPeriodEnd)
    : null;

  const canQueryUsage =
    stripeService &&
    periodStart &&
    periodEnd &&
    !isNaN(periodStart.getTime()) &&
    !isNaN(periodEnd.getTime()) &&
    c.env.CLOUDFLARE_ACCOUNT_ID &&
    c.env.CLOUDFLARE_API_TOKEN;

  if (canQueryUsage) {
    try {
      usageThisPeriod = await stripeService.queryPeriodUsage(
        organizationId,
        periodStart,
        periodEnd
      );
    } catch (error) {
      // Analytics Engine query may fail in development - log but don't block
      console.warn("Failed to query period usage (expected in dev):", error);
    }
  }

  // Determine plan - Pro if has active subscription OR canceled but still in period
  const hasProAccess =
    org.subscriptionStatus === "active" ||
    (org.subscriptionStatus === "canceled" &&
      org.currentPeriodEnd &&
      new Date(org.currentPeriodEnd) > new Date());
  const plan = hasProAccess ? "pro" : "trial";
  const includedCredits = hasProAccess ? org.computeCredits : 0;

  const response: GetBillingResponse = {
    billing: {
      plan: plan as "trial" | "pro",
      subscriptionStatus: org.subscriptionStatus ?? undefined,
      currentPeriodStart: org.currentPeriodStart ?? undefined,
      currentPeriodEnd: org.currentPeriodEnd ?? undefined,
      usageThisPeriod,
      includedCredits,
    },
  };

  return c.json(response);
});

/**
 * POST /billing/checkout
 *
 * Create a Stripe Checkout session for upgrading to Pro plan
 */
billing.post(
  "/checkout",
  zValidator(
    "json",
    z.object({
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }) as z.ZodType<CreateCheckoutSessionRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const jwtPayload = c.get("jwtPayload")!;
    const { successUrl, cancelUrl } = c.req.valid("json");

    const stripeService = createStripeService(c.env);
    if (!stripeService) {
      return c.json({ error: "Stripe is not configured" }, 503);
    }

    try {
      const checkoutUrl = await stripeService.createCheckoutSession(
        organizationId,
        jwtPayload.email ?? "",
        successUrl,
        cancelUrl
      );

      const response: CreateCheckoutSessionResponse = { checkoutUrl };
      return c.json(response);
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      return c.json({ error: "Failed to create checkout session" }, 500);
    }
  }
);

/**
 * POST /billing/portal
 *
 * Create a Stripe Billing Portal session for managing subscription
 */
billing.post(
  "/portal",
  zValidator(
    "json",
    z.object({
      returnUrl: z.string().url(),
    })
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const { returnUrl } = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    // Get Stripe customer ID from organization
    const [org] = await db
      .select({ stripeCustomerId: organizations.stripeCustomerId })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org?.stripeCustomerId) {
      return c.json({ error: "No active subscription found" }, 400);
    }

    const stripeService = createStripeService(c.env);
    if (!stripeService) {
      return c.json({ error: "Stripe is not configured" }, 503);
    }

    try {
      const portalUrl = await stripeService.createBillingPortalSession(
        org.stripeCustomerId,
        returnUrl
      );

      const response: CreateBillingPortalResponse = { portalUrl };
      return c.json(response);
    } catch (error) {
      console.error("Failed to create billing portal session:", error);
      return c.json({ error: "Failed to create billing portal session" }, 500);
    }
  }
);

export default billing;
