import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type Stripe from "stripe";

import { PRO_INCLUDED_CREDITS } from "../constants/billing";
import type { ApiContext } from "../context";
import {
  createDatabase,
  organizations,
  Plan,
  SubscriptionStatus,
  users,
} from "../db";
import { createStripeService } from "../services/stripe-service";
import { resetOrganizationComputeUsage } from "../utils/credits";

const stripeWebhooks = new Hono<ApiContext>();

/**
 * POST /stripe/webhooks
 *
 * Handle Stripe webhook events for subscription lifecycle
 */
stripeWebhooks.post("/", async (c) => {
  const stripeService = createStripeService(c.env);
  if (!stripeService) {
    return c.json({ error: "Stripe is not configured" }, 503);
  }

  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  // Get raw body for signature verification
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  let event: Stripe.Event;
  try {
    // Use async version for Cloudflare Workers (SubtleCrypto requires async)
    event = await stripeService
      .getStripe()
      .webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  const db = createDatabase(c.env.DB);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(db, subscription, c.env.KV);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(db, subscription);
        break;
      }

      case "invoice.created": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceCreated(db, stripeService, invoice, c.env);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

/**
 * Handle checkout.session.completed event
 * Links Stripe customer to organization and activates subscription
 */
async function handleCheckoutCompleted(
  db: ReturnType<typeof createDatabase>,
  session: Stripe.Checkout.Session
) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error("Checkout session missing organizationId metadata");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error("Checkout session missing customer or subscription");
    return;
  }

  // Update organization with Stripe IDs
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  // Update user plan to PRO
  await db
    .update(users)
    .set({
      plan: Plan.PRO,
      updatedAt: new Date(),
    })
    .where(eq(users.organizationId, organizationId));

  console.log(
    `Organization ${organizationId} upgraded to Pro (customer: ${customerId})`
  );
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status and billing period
 */
async function handleSubscriptionUpdated(
  db: ReturnType<typeof createDatabase>,
  subscription: Stripe.Subscription,
  KV: KVNamespace
) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    // Try to find org by subscription ID
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (!org) {
      console.error(
        `No organization found for subscription ${subscription.id}`
      );
      return;
    }

    await updateOrganizationSubscription(db, org.id, subscription, KV);
  } else {
    await updateOrganizationSubscription(db, organizationId, subscription, KV);
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades organization to free plan
 */
async function handleSubscriptionDeleted(
  db: ReturnType<typeof createDatabase>,
  subscription: Stripe.Subscription
) {
  // Find org by subscription ID
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!org) {
    console.error(`No organization found for subscription ${subscription.id}`);
    return;
  }

  // Update organization to canceled
  await db
    .update(organizations)
    .set({
      subscriptionStatus: SubscriptionStatus.CANCELED,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id));

  // Downgrade users to free plan
  await db
    .update(users)
    .set({
      plan: Plan.TRIAL,
      updatedAt: new Date(),
    })
    .where(eq(users.organizationId, org.id));

  console.log(`Organization ${org.id} subscription canceled`);
}

/**
 * Handle invoice.created event
 * Query Analytics Engine for usage and report to Stripe meter
 */
async function handleInvoiceCreated(
  db: ReturnType<typeof createDatabase>,
  stripeService: ReturnType<typeof createStripeService>,
  invoice: Stripe.Invoice,
  env: { CLOUDFLARE_ACCOUNT_ID?: string; CLOUDFLARE_API_TOKEN?: string }
) {
  if (!stripeService) return;

  // Skip if Analytics Engine is not configured (e.g., in development)
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    console.log("Skipping usage reporting: Analytics Engine not configured");
    return;
  }

  // Only process subscription invoices (check if billing_reason indicates subscription)
  if (!invoice.billing_reason?.includes("subscription")) return;

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  // Find organization by customer ID
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId))
    .limit(1);

  if (!org) {
    console.error(`No organization found for customer ${customerId}`);
    return;
  }

  // Calculate billing period from invoice
  const periodStart = new Date((invoice.period_start ?? 0) * 1000);
  const periodEnd = new Date((invoice.period_end ?? 0) * 1000);

  try {
    // Query Analytics Engine for usage in this period
    const totalUsage = await stripeService.queryPeriodUsage(
      org.id,
      periodStart,
      periodEnd
    );

    // Calculate overage (usage beyond included credits)
    const overageUsage = Math.max(0, totalUsage - PRO_INCLUDED_CREDITS);

    if (overageUsage > 0) {
      // Report overage to Stripe meter
      await stripeService.reportUsageToMeter(customerId, overageUsage);
      console.log(
        `Reported ${overageUsage} overage credits to Stripe for org ${org.id}`
      );
    }
  } catch (error) {
    console.error(`Failed to process usage for invoice ${invoice.id}:`, error);
  }
}

/**
 * Helper to update organization subscription details
 */
async function updateOrganizationSubscription(
  db: ReturnType<typeof createDatabase>,
  organizationId: string,
  subscription: Stripe.Subscription,
  KV: KVNamespace
) {
  // Map Stripe status to our status enum
  const statusMap: Record<Stripe.Subscription.Status, string> = {
    active: SubscriptionStatus.ACTIVE,
    canceled: SubscriptionStatus.CANCELED,
    past_due: SubscriptionStatus.PAST_DUE,
    unpaid: SubscriptionStatus.UNPAID,
    trialing: SubscriptionStatus.TRIALING,
    incomplete: SubscriptionStatus.UNPAID,
    incomplete_expired: SubscriptionStatus.CANCELED,
    paused: SubscriptionStatus.CANCELED,
  };

  let subscriptionStatus =
    statusMap[subscription.status] || SubscriptionStatus.CANCELED;

  // If subscription is scheduled to cancel, treat as canceled
  // This handles the case where user cancels but subscription is still "active" until period ends
  // Check both cancel_at_period_end and cancel_at (timestamp when it will cancel)
  const isScheduledToCancel =
    subscription.cancel_at_period_end || subscription.cancel_at !== null;
  if (isScheduledToCancel) {
    subscriptionStatus = SubscriptionStatus.CANCELED;
  }

  // Get billing period from subscription items
  const subscriptionItem = subscription.items?.data?.[0];
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  // Check if billing period has changed (new billing cycle started)
  // If so, reset usage counter in KV
  if (periodStart) {
    const [currentOrg] = await db
      .select({ currentPeriodStart: organizations.currentPeriodStart })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const newPeriodStart = new Date(periodStart * 1000);
    const existingPeriodStart = currentOrg?.currentPeriodStart
      ? new Date(currentOrg.currentPeriodStart)
      : null;

    // Reset usage if period start has changed (new billing cycle)
    if (
      !existingPeriodStart ||
      newPeriodStart.getTime() !== existingPeriodStart.getTime()
    ) {
      await resetOrganizationComputeUsage(KV, organizationId);
      console.log(
        `Reset compute usage for org ${organizationId} (new billing period: ${newPeriodStart.toISOString()})`
      );
    }
  }

  await db
    .update(organizations)
    .set({
      subscriptionStatus: subscriptionStatus as any,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  // Also downgrade users if subscription is canceled
  if (subscriptionStatus === SubscriptionStatus.CANCELED) {
    await db
      .update(users)
      .set({
        plan: Plan.TRIAL,
        updatedAt: new Date(),
      })
      .where(eq(users.organizationId, organizationId));
  }
}

export default stripeWebhooks;
