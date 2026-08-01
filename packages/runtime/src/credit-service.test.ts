/**
 * `isUsageExhausted` decides whether an organization may start another run, so
 * it is the difference between cutting off a paying customer and giving away
 * unlimited compute. The two directions fail in opposite ways, which is why
 * both boundaries are pinned exactly rather than approximately.
 */

import { describe, expect, it } from "vitest";

import { type BillingContext, isUsageExhausted } from "./credit-service";

const billing = (over: Partial<BillingContext> = {}): BillingContext => ({
  computeCredits: 100,
  ...over,
});

describe("free plans", () => {
  it("allows usage below the included credits", () => {
    expect(isUsageExhausted(99, billing())).toBe(false);
  });

  it("cuts off exactly at the included credits", () => {
    expect(isUsageExhausted(100, billing())).toBe(true);
  });

  it("stays cut off beyond the included credits", () => {
    expect(isUsageExhausted(500, billing())).toBe(true);
  });

  it("allows a fresh account", () => {
    expect(isUsageExhausted(0, billing())).toBe(false);
  });

  it("treats an inactive subscription like a free plan", () => {
    expect(
      isUsageExhausted(100, billing({ subscriptionStatus: "canceled" }))
    ).toBe(true);
  });

  it("ignores an overage limit when the subscription is not active", () => {
    // Overage is a paid-plan feature; a lapsed subscription must not keep it.
    expect(
      isUsageExhausted(
        150,
        billing({ subscriptionStatus: "past_due", overageLimit: 1000 })
      )
    ).toBe(true);
  });

  it("handles zero included credits", () => {
    expect(isUsageExhausted(0, billing({ computeCredits: 0 }))).toBe(true);
  });
});

describe("active subscriptions", () => {
  const active = (over: Partial<BillingContext> = {}) =>
    billing({ subscriptionStatus: "active", ...over });

  it("never exhausts when overage is uncapped", () => {
    expect(isUsageExhausted(1_000_000, active({ overageLimit: null }))).toBe(
      false
    );
  });

  it("treats an absent overage limit as uncapped", () => {
    // `== null` covers undefined too; an unset limit must not read as zero,
    // which would cut off every paying customer at their included credits.
    expect(isUsageExhausted(1_000_000, active())).toBe(false);
  });

  it("allows usage within the included credits", () => {
    expect(isUsageExhausted(50, active({ overageLimit: 10 }))).toBe(false);
  });

  it("allows overage below the cap", () => {
    expect(isUsageExhausted(105, active({ overageLimit: 10 }))).toBe(false);
  });

  it("cuts off exactly at the overage cap", () => {
    expect(isUsageExhausted(110, active({ overageLimit: 10 }))).toBe(true);
  });

  it("stays cut off beyond the overage cap", () => {
    expect(isUsageExhausted(200, active({ overageLimit: 10 }))).toBe(true);
  });

  describe("with overage capped at zero", () => {
    // Customers can set this through the billing API to mean "never bill me
    // past my plan". It must still let them spend the credits they paid for.
    const noOverage = () => active({ overageLimit: 0 });

    it("still allows a fresh account to run", () => {
      expect(isUsageExhausted(0, noOverage())).toBe(false);
    });

    it("still allows usage within the included credits", () => {
      expect(isUsageExhausted(99, noOverage())).toBe(false);
    });

    it("cuts off exactly at the included credits", () => {
      expect(isUsageExhausted(100, noOverage())).toBe(true);
    });

    it("stays cut off beyond the included credits", () => {
      expect(isUsageExhausted(101, noOverage())).toBe(true);
    });
  });

  it("does not count unused included credits against the overage cap", () => {
    // Math.max(0, ...) guards this: usage under the allowance is not negative
    // overage that could be banked.
    expect(isUsageExhausted(10, active({ overageLimit: 1 }))).toBe(false);
  });
});

describe("unlimited accounts", () => {
  it("never exhausts, whatever the usage", () => {
    expect(isUsageExhausted(999_999, billing({ unlimitedUsage: true }))).toBe(
      false
    );
  });

  it("outranks an exhausted free plan", () => {
    expect(
      isUsageExhausted(
        1_000,
        billing({ computeCredits: 1, unlimitedUsage: true })
      )
    ).toBe(false);
  });

  it("outranks a breached overage cap", () => {
    expect(
      isUsageExhausted(
        1_000,
        billing({
          subscriptionStatus: "active",
          overageLimit: 0,
          unlimitedUsage: true,
        })
      )
    ).toBe(false);
  });

  it("does not treat an explicit false as unlimited", () => {
    expect(isUsageExhausted(100, billing({ unlimitedUsage: false }))).toBe(
      true
    );
  });
});
