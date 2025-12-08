import Stripe from "stripe";

import type { Bindings } from "../context";

/**
 * Service for Stripe billing operations.
 * Handles checkout sessions, billing portal, and usage reporting.
 */
export class StripeService {
  private stripe: Stripe;
  private env: Bindings;

  constructor(env: Bindings) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    this.env = env;
  }

  /**
   * Create a checkout session for upgrading to Pro plan
   */
  async createCheckoutSession(
    organizationId: string,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    if (!this.env.STRIPE_PRICE_ID_PRO) {
      throw new Error("STRIPE_PRICE_ID_PRO is required");
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: customerEmail,
      line_items: [
        {
          price: this.env.STRIPE_PRICE_ID_PRO,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
      },
      subscription_data: {
        metadata: {
          organizationId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return session.url;
  }

  /**
   * Create a billing portal session for subscription management
   */
  async createBillingPortalSession(
    stripeCustomerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Report usage to Stripe meter for billing
   */
  async reportUsageToMeter(
    stripeCustomerId: string,
    usage: number
  ): Promise<void> {
    if (!this.env.STRIPE_METER_ID) {
      console.warn("STRIPE_METER_ID not configured, skipping usage report");
      return;
    }

    if (usage <= 0) {
      return; // No usage to report
    }

    await this.stripe.billing.meterEvents.create({
      event_name: "dafthunk_compute_credits",
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: String(usage),
      },
    });
  }

  /**
   * Query Analytics Engine for usage in a billing period
   */
  async queryPeriodUsage(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    if (!this.env.CLOUDFLARE_ACCOUNT_ID || !this.env.CLOUDFLARE_API_TOKEN) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for usage queries"
      );
    }

    const dataset = this.getDatasetName();
    const startTimestamp = periodStart
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");
    const endTimestamp = periodEnd
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    // Query Analytics Engine for total usage in period
    // double4 contains the usage value per execution
    const sql = `
      SELECT
        sum(double4 * _sample_interval) AS total_usage
      FROM ${dataset}
      WHERE index1 = '${organizationId}'
        AND timestamp >= toDateTime('${startTimestamp}')
        AND timestamp < toDateTime('${endTimestamp}')
    `;

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: sql,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Analytics query failed: ${response.statusText} - ${error}`
      );
    }

    const result = (await response.json()) as {
      data?: { total_usage: number }[];
    };
    return result.data?.[0]?.total_usage ?? 0;
  }

  /**
   * Get Stripe instance for webhook verification
   */
  getStripe(): Stripe {
    return this.stripe;
  }

  /**
   * Get the dataset name based on environment
   */
  private getDatasetName(): string {
    const env = this.env.CLOUDFLARE_ENV || "development";
    return env === "production"
      ? "dafthunk_executions_production"
      : "dafthunk_executions_development";
  }
}

/**
 * Create a StripeService instance if Stripe is configured
 */
export function createStripeService(env: Bindings): StripeService | null {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new StripeService(env);
}
