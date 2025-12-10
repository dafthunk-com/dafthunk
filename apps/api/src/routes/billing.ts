import type {
  CreateBillingPortalResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  GetBillingResponse,
  UpdateOverageLimitRequest,
  UpdateOverageLimitResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { PRO_INCLUDED_CREDITS, TRIAL_CREDITS } from "../constants/billing";
import type { ApiContext } from "../context";
import { createDatabase, organizations } from "../db";
import { createStripeService } from "../services/stripe-service";
import { getOrganizationComputeUsage } from "../utils/credits";

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

  // Get current usage from KV storage
  const usageThisPeriod = await getOrganizationComputeUsage(
    c.env.KV,
    organizationId
  );

  // Determine plan - Pro if has active subscription OR canceled but still in period
  const hasProAccess =
    org.subscriptionStatus === "active" ||
    (org.subscriptionStatus === "canceled" &&
      org.currentPeriodEnd &&
      new Date(org.currentPeriodEnd) > new Date());
  const plan = hasProAccess ? "pro" : "trial";
  // Use constants for included credits (database value may be outdated)
  const includedCredits = hasProAccess ? PRO_INCLUDED_CREDITS : TRIAL_CREDITS;

  const response: GetBillingResponse = {
    billing: {
      plan: plan as "trial" | "pro",
      subscriptionStatus: org.subscriptionStatus ?? undefined,
      currentPeriodStart: org.currentPeriodStart ?? undefined,
      currentPeriodEnd: org.currentPeriodEnd ?? undefined,
      usageThisPeriod,
      includedCredits,
      overageLimit: org.overageLimit ?? null,
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

/**
 * PATCH /billing/overage-limit
 *
 * Update the overage limit for the current organization
 */
billing.patch(
  "/overage-limit",
  zValidator(
    "json",
    z.object({
      overageLimit: z.number().int().min(0).nullable(),
    }) as z.ZodType<UpdateOverageLimitRequest>
  ),
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const { overageLimit } = c.req.valid("json");
    const db = createDatabase(c.env.DB);

    // Update the overage limit
    await db
      .update(organizations)
      .set({ overageLimit, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    const response: UpdateOverageLimitResponse = { overageLimit };
    return c.json(response);
  }
);

export default billing;
