import { env } from "cloudflare:test";
import type { NodeType } from "@dafthunk/types";

import type { Bindings } from "../../../context";
import { CloudflareNodeRegistry } from "../../../runtime/cloudflare-node-registry";
import type { OrgResources, OrgResourceType } from "../org-resources";

/**
 * The deployment and the tenant that every generator harness measures against.
 *
 * One module because the offline gate and the billed benchmark have to be
 * asking about the same platform. They were not: the gate ranked a catalog
 * built from placeholder credentials and the benchmark ranked whatever this
 * machine happened to have in `.dev.vars`, which is a difference of seventy
 * node types — so the gate's verdict said nothing reliable about the sweep it
 * exists to predict, and the connected-provider list was hand-copied between
 * them and free to drift.
 *
 * Nothing here is ever executed. The values are credentials in name only, and
 * both consumers stop at each node type's declaration.
 */

/**
 * What the platform ships with, rather than what this machine is configured
 * for.
 *
 * A seventh of the registry is gated on a credential — each OAuth integration
 * on its client pair, web search on its API key, SMS on its Twilio trio — and
 * those live in `.dev.vars`, which a developer has and CI does not. Left
 * ambient, a suite ranks 452 node types on a laptop and 369 on CI: different
 * corpora, so different IDF, so a different answer to the only question it
 * asks.
 *
 * The email service is the one gate that is a binding rather than a secret,
 * and it is placeholdered the same way for the same reason: the registry only
 * checks that it exists, production binds it, and `notify-me` is the node
 * every "email me the result" is built from. Safe only because nothing here
 * runs — a harness that executes nodes must leave this unbound and let the
 * registry withhold them, which is why the evaluation tier does exactly that.
 */
export const DEPLOYMENT_BINDINGS: Bindings = {
  ...(env as unknown as Bindings),
  SEND_EMAIL: {} as SendEmail,
  SEND_EMAIL_FROM: "test",
  CLOUDFLARE_ACCOUNT_ID: "test",
  CLOUDFLARE_API_TOKEN: "test",
  GOOGLE_API_KEY: "test",
  TAVILY_API_KEY: "test",
  TWILIO_ACCOUNT_SID: "test",
  TWILIO_AUTH_TOKEN: "test",
  TWILIO_PHONE_NUMBER: "test",
  INTEGRATION_DISCORD_CLIENT_ID: "test",
  INTEGRATION_DISCORD_CLIENT_SECRET: "test",
  INTEGRATION_GITHUB_CLIENT_ID: "test",
  INTEGRATION_GITHUB_CLIENT_SECRET: "test",
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID: "test",
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET: "test",
  INTEGRATION_GOOGLE_MAIL_CLIENT_ID: "test",
  INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET: "test",
  INTEGRATION_LINKEDIN_CLIENT_ID: "test",
  INTEGRATION_LINKEDIN_CLIENT_SECRET: "test",
  INTEGRATION_REDDIT_CLIENT_ID: "test",
  INTEGRATION_REDDIT_CLIENT_SECRET: "test",
  INTEGRATION_WORDPRESS_CLIENT_ID: "test",
  INTEGRATION_WORDPRESS_CLIENT_SECRET: "test",
  INTEGRATION_X_CLIENT_ID: "test",
  INTEGRATION_X_CLIENT_SECRET: "test",
};

/** Built once: the registry runs several hundred registrations. */
export const DEPLOYMENT_CATALOG: NodeType[] = new CloudflareNodeRegistry(
  DEPLOYMENT_BINDINGS,
  false
).getNodeTypes();

/**
 * The accounts the tenant has linked.
 *
 * Several templates deliver through an OAuth account, and eligibility withholds
 * those nodes outright when the account is not linked — correctly, but it would
 * make a retrieval measurement into a measurement of connection state.
 */
export const CONNECTED_PROVIDERS: ReadonlySet<string> = new Set([
  "slack",
  "discord",
  "telegram",
  "whatsapp",
  "google-mail",
  "github",
]);

/**
 * What the tenant owns, so the resource concepts have something to resolve to.
 *
 * Without this a harness measures an org that owns nothing: `database`,
 * `schema` and `dataset` inputs are optional on every node that carries them,
 * so a graph reaching for a table binds nothing, validates anyway, and scores
 * as a pass. One instance per type on purpose — a single candidate makes
 * "picked the right one" trivial, which keeps a case about whether the model
 * reached for the resource at all.
 *
 * Places — databases, datasets, mailboxes — are reuse targets only: the
 * benchmark supplies no creator for them, so a case needing a table the org
 * does not own should fail. Schemas are the exception, and the benchmark's
 * `createBenchSchema` says why.
 */
export const ORG_RESOURCES: OrgResources = {
  database: [
    {
      id: "bench-database",
      name: "Customers",
      description: "One row per customer, keyed by email.",
    },
  ],
  schema: [
    {
      id: "bench-schema",
      name: "Customer enquiry",
      description: "Name, email and a free-text question.",
      // Carried because a form trigger's ports are derived from them. A schema
      // without fields binds and leaves the form with nothing to wire, which is
      // the failure this suite found.
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "question", type: "string", required: true },
      ],
    },
  ],
  dataset: [
    {
      id: "bench-dataset",
      name: "Product documentation",
      description: "The public docs, chunked for retrieval.",
    },
  ],
  queue: [{ id: "bench-queue", name: "Incoming jobs" }],
  email: [{ id: "bench-mailbox", name: "Support", handle: "support" }],
};

/**
 * The resource families whose nodes may be offered, derived from what the
 * tenant above owns rather than listed a second time.
 *
 * `filterEligible` withholds a node whose required resource nobody can supply,
 * so a gate that ranks without this measures eligibility policy where it meant
 * to measure retrieval.
 */
export const OFFERABLE_RESOURCES: ReadonlySet<string> = new Set(
  Object.keys(ORG_RESOURCES) as OrgResourceType[]
);
