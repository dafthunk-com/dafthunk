import { BillingCreditsResponse } from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, getOrganizationComputeCredits } from "../db";
import { getOrganizationComputeUsage } from "../utils/credits";

const billing = new Hono<ApiContext>();

billing.use("*", jwtMiddleware);

// Get compute usage for an organization
billing.get("/credits", async (c) => {
  const organizationId = c.get("organizationId")!;

  try {
    const computeCredits = await getOrganizationComputeCredits(
      createDatabase(c.env.DB),
      organizationId
    );
    if (computeCredits === undefined) {
      return c.json(
        {
          error: "Organization not found",
        },
        404
      );
    }

    const computeUsage = await getOrganizationComputeUsage(
      c.env.KV,
      organizationId
    );

    return c.json<BillingCreditsResponse>({
      computeCredits,
      computeUsage,
    });
  } catch (error) {
    console.error("Failed to get compute usage:", error);
    return c.json(
      {
        error: "Failed to get compute usage",
      },
      500
    );
  }
});

export default billing;
