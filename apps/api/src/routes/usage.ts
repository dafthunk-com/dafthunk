import { UsageResponse } from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, getOrganizationComputeCredits } from "../db";
import { getOrganizationComputeUsage } from "../utils/credits";

const usage = new Hono<ApiContext>();

usage.use("*", jwtMiddleware);

// Get usage for an organization
usage.get("/", async (c) => {
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

    return c.json<UsageResponse>({
      computeCredits,
      computeUsage,
      remainingCredits: Math.max(0, computeCredits - computeUsage),
      usagePercentage: Math.min(100, (computeUsage / computeCredits) * 100),
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

export default usage;
