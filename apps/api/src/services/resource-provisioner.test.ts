import type { D1Migration } from "cloudflare:test";
import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../db";
import { getSchemas } from "../db/queries";
import { organizations } from "../db/schema";
import { createResourceProvisioner } from "./resource-provisioner";

const testEnv = env as unknown as {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
};

const ORG = "org-provisioner-test";

describe("createResourceProvisioner", () => {
  beforeAll(async () => {
    await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
    // Schema rows carry a cascading FK to the org that owns them.
    await createDatabase(testEnv.DB)
      .insert(organizations)
      .values({ id: ORG, name: "Provisioner Test Org" })
      .onConflictDoNothing();
  });

  const provision = () =>
    createResourceProvisioner(createDatabase(testEnv.DB), ORG);

  describe("schemas", () => {
    /**
     * The fields have to come back. Hydration grows a form trigger's ports out
     * of them, and a resource that arrives without them binds an id onto a node
     * with nothing to wire — the exact failure the port derivation exists to
     * prevent, reintroduced from the creating side.
     */
    it("hands back the fields it stored", async () => {
      const resource = await provision()("schema", {
        name: "enquiry",
        description: "What the visitor asked",
        fields: [
          { name: "email", type: "string", required: true },
          { name: "question", type: "string" },
        ],
      });

      expect(resource.fields).toEqual([
        { name: "email", type: "string", required: true },
        { name: "question", type: "string" },
      ]);

      const stored = (await getSchemas(createDatabase(testEnv.DB), ORG)).find(
        (row) => row.id === resource.id
      );
      expect(JSON.parse(stored?.fields ?? "[]")).toEqual(resource.fields);
    });

    /** `POST /schemas` refuses anything else, so an uncoerced name would
     * produce a row its owner could never edit. */
    it("coerces the name to something the schemas route accepts", async () => {
      const resource = await provision()("schema", {
        name: "Support request",
        fields: [{ name: "subject", type: "string" }],
      });

      expect(resource.name).toBe("Support_request");
    });

    it("drops fields no schema row could hold", async () => {
      const resource = await provision()("schema", {
        name: "mixed",
        fields: [
          { name: "ok", type: "string" },
          { name: "not an identifier", type: "string" },
          { name: "bogus", type: "nonsense" as never },
        ],
      });

      expect(resource.fields).toEqual([{ name: "ok", type: "string" }]);
    });

    it("refuses a schema with nothing usable in it", async () => {
      await expect(
        provision()("schema", {
          name: "empty",
          fields: [{ name: "not an identifier", type: "string" }],
        })
      ).rejects.toThrow("at least one usable field");
    });
  });
});
