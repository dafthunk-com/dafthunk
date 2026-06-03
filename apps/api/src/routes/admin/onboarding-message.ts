import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { getAnthropicConfig } from "@dafthunk/runtime/utils/ai-gateway";
import type { WorkflowTemplate } from "@dafthunk/types";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import {
  createDatabase,
  createThread,
  getInboxByAlias,
  messages,
  threads,
  users,
  workflows,
} from "../../db";
import { sendOutboundSupportMessage } from "../../support-send";
import { SUPPORT_INBOX_ALIAS } from "../../support-storage";
import { workflowTemplates } from "../../templates";

const adminOnboardingMessageRoutes = new Hono<ApiContext>();

const FUNNEL_STAGE_LABEL = {
  signed_up: "Signed up but never started the tour",
  tour_completed: "Completed the tour but never created a workflow",
  workflow_created: "Created a workflow but never executed it",
  workflow_executed: "Executed a workflow but never had a successful run",
} as const;

// Users idle ≥ this many days are surfaced as "dormant" instead of stuck:
// stage-specific nudges feel stale, so the prompt switches to a
// re-engagement tone and past correspondence is omitted.
const DORMANCY_DAYS = 30;

// Anthropic Claude Sonnet 4 via Cloudflare AI Gateway. The gateway stores
// the API key; this code authenticates with `apiKey: "gateway-managed"`
// and lets the gateway inject the real key. Faster end-to-end for the
// admin's interactive draft flow than Workers AI Llama 70B, and tool-use
// gives reliable structured JSON.
const DRAFT_MODEL = "claude-sonnet-4-0";

interface PastSupportMessage {
  direction: "inbound" | "outbound";
  subject: string;
  snippet: string;
  createdAt: Date;
}

interface DraftContext {
  user: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
  };
  furthestStage: keyof typeof FUNNEL_STAGE_LABEL;
  daysSinceAdvance: number;
  // Workflows visible to this user via their org. The `workflows` table is
  // scoped per org (no per-user authorship column), so in a multi-member
  // org these may include workflows authored by teammates — the prompt
  // surfaces them as "in your workspace", not "you created".
  orgWorkflowNames: string[];
  // Most-recent-first snippets from the user's past support threads
  // (welcome email, prior nudges, their replies). Lets the AI avoid
  // re-asking what was already answered and reference prior context.
  pastSupportMessages: PastSupportMessage[];
}

// Common 3+ letter tokens that match too aggressively. Filtered before
// scoring so templates aren't suggested on the strength of stop words.
const TOKEN_STOPLIST = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "you",
  "this",
  "that",
  "into",
  "out",
  "use",
  "test",
  "demo",
  "workflow",
  "workflows",
  "node",
  "nodes",
  "new",
  "old",
  "api",
]);

interface SuggestedTemplate {
  id: string;
  name: string;
  description: string;
  score: number;
}

// Lower-case tokenizer. Drops sub-3-character tokens and a small set of
// stop words; without the stoplist, broad words like "workflow"/"the" let
// almost any template hit the score threshold against any user.
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !TOKEN_STOPLIST.has(t));
}

// Pick the template with the highest tag+keyword overlap against the user's
// workflow names and error messages. Cheap heuristic that runs against the
// in-memory template list — no R2 reads needed.
function pickTemplate(
  templates: WorkflowTemplate[],
  ctx: DraftContext
): SuggestedTemplate | null {
  const haystack = new Set(ctx.orgWorkflowNames.flatMap(tokenize));
  if (haystack.size === 0) return null;

  let best: SuggestedTemplate | null = null;
  for (const template of templates) {
    const needles = new Set([
      ...template.tags.flatMap(tokenize),
      ...tokenize(template.name),
    ]);
    let score = 0;
    for (const needle of needles) {
      if (haystack.has(needle)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = {
        id: template.id,
        name: template.name,
        description: template.description,
        score,
      };
    }
  }
  // Require at least 2 overlapping non-stoplist tokens. Single-token
  // matches were observed to be coincidental in early testing — common
  // category words (which slip past the 3-char filter) anchor too many
  // templates to too many users.
  return best && best.score >= 2 ? best : null;
}

// Past support thread messages for this user, most recent first. Joins
// messages to threads and filters on threads.userId so we pull both
// inbound (the user's replies) and outbound (admin sends, welcome email)
// messages. Snippets are pre-built at insert time via `buildSnippet`, so
// no R2 reads are needed.
async function fetchPastSupportMessages(
  db: ReturnType<typeof createDatabase>,
  userId: string,
  limit: number
): Promise<PastSupportMessage[]> {
  const rows = await db
    .select({
      direction: messages.direction,
      subject: messages.subject,
      snippet: messages.snippet,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(eq(threads.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    direction: r.direction as "inbound" | "outbound",
    subject: r.subject,
    snippet: r.snippet.slice(0, 280),
    createdAt: r.createdAt,
  }));
}

function derivePerUserFunnel(row: {
  createdAt: Date;
  tourCompleted: Date | null;
  workflowCreated: Date | null;
  workflowExecuted: Date | null;
  workflowExecutedOk: Date | null;
}): {
  furthestStage: keyof typeof FUNNEL_STAGE_LABEL | "workflow_executed_ok";
  furthestAt: Date;
  daysSinceAdvance: number;
} {
  let furthestStage: DraftContext["furthestStage"] | "workflow_executed_ok" =
    "signed_up";
  let furthestAt: Date = row.createdAt;
  if (row.tourCompleted) {
    furthestStage = "tour_completed";
    furthestAt = row.tourCompleted;
  }
  if (row.workflowCreated) {
    furthestStage = "workflow_created";
    furthestAt = row.workflowCreated;
  }
  if (row.workflowExecuted) {
    furthestStage = "workflow_executed";
    furthestAt = row.workflowExecuted;
  }
  if (row.workflowExecutedOk) {
    furthestStage = "workflow_executed_ok";
    furthestAt = row.workflowExecutedOk;
  }
  const daysSinceAdvance = Math.max(
    0,
    Math.floor((Date.now() - furthestAt.getTime()) / (24 * 60 * 60 * 1000))
  );
  return { furthestStage, furthestAt, daysSinceAdvance };
}

// Style rules applied to both stuck and dormant drafts. Em dashes and
// hype words are the strongest AI tells; the Strunk & White block keeps
// the prose lean and concrete, matching the founder's existing voice in
// the welcome email.
const STYLE_RULES = [
  "- Do NOT use newlines in subject. Plain text only.",
  "- Do NOT use em dashes, en dashes, or hyphens as sentence connectors.",
  "  Use commas, periods, or parentheses instead. Hyphens inside compound",
  "  words (e.g. 're-engagement') are fine.",
  "",
  "Apply Strunk & White's Elements of Style:",
  "- Use the active voice. Prefer 'I noticed X' over 'X was noticed'.",
  "- Put statements in positive form. Say what something is, not what",
  "  it isn't.",
  "- Use definite, specific, concrete language. Pick the precise noun and",
  "  verb. Avoid 'thing', 'stuff', 'really', 'very', 'just', 'somewhat'.",
  "- Omit needless words. Every sentence must earn its place; cut any",
  "  word that doesn't add meaning.",
  "- Use short sentences. Break long ones in two.",
  "- Avoid qualifiers (rather, very, little, pretty). They weaken prose.",
  "- Avoid foreign phrases, jargon, and bureaucratic language. Plain",
  "  Anglo-Saxon words over Latinate ones (use 'help', not 'facilitate').",
  "- Place the emphatic word at the end of the sentence.",
  "- No exclamation points except for genuine emphasis. No hype words",
  "  ('amazing', 'awesome', 'excited').",
].join("\n");

function buildPrompt(
  ctx: DraftContext,
  template: SuggestedTemplate | null,
  isDormant: boolean
): { system: string; user: string } {
  const stuckSystem = [
    "You are Bertil, the solo founder of Dafthunk, a visual workflow automation",
    "platform built on Cloudflare. You are writing a brief, considerate email",
    "to a user who signed up but has not yet activated. The aim is to offer",
    "help, not push them. Aim for 70 to 110 words. Prose only, no bulleted",
    "lists.",
    "",
    "Structure (three short paragraphs, no headings):",
    "1. Greeting + acknowledgment: 'Hello <first name>,' on its own line,",
    "   then one sentence that quietly names where they are in onboarding",
    "   without sounding like surveillance.",
    "2. Offer of help: one or two sentences. If a relevant template is",
    "   suggested, mention it by NAME only (no URL; a link is appended) as",
    "   one option they might find useful. Otherwise, leave the question",
    "   open and invite them to share what they are trying to automate.",
    "   Make clear you are happy to help with that or anything else.",
    "3. Closing + signature: one short, non-pressuring line (e.g., 'No",
    "   rush; reply if it is useful.'), then 'Bertil' on its own line.",
    "",
    "Subject line:",
    "- Keep it neutral and slightly formal, not a chatty check-in. Avoid",
    "  'Checking in', 'Just wanted to', exclamation points, and emoji. A",
    "  noun phrase about the topic works well (e.g., 'Your Dafthunk",
    "  workflow', 'Getting started with Dafthunk', 'A hand with your",
    "  workflow').",
    "",
    "Hard rules:",
    "- The only per-user signals you can rely on are: funnel stage and days",
    "  at that stage. Do NOT claim the user has run, executed, succeeded,",
    "  failed, or seen errors with any workflow; we cannot attribute org",
    "  activity to them individually.",
    "- Workflow names listed below exist in the user's org but may have been",
    "  authored by teammates. Refer to them as 'in your workspace', never",
    "  'you built' or 'you tried'.",
    "- Do not be prescriptive about next steps or 'what to do'. Frame help",
    "  as offered, not assigned.",
    "- If past support correspondence is shown, treat it as the live state",
    "  of the conversation: do not re-introduce yourself, do not re-ask",
    "  what was already answered.",
    "",
    STYLE_RULES,
  ].join("\n");

  // Dormant users signed up a long time ago and almost certainly don't
  // remember Dafthunk specifically — past sessions, errors, even the
  // platform's value prop are gone from memory. Treat this as a soft
  // re-introduction, not a nudge: mirror the welcome email's tone (warm,
  // one open question, a one-sentence reminder of what Dafthunk is, a
  // concrete starting point). Past support snippets are omitted upstream.
  const dormantSystem = [
    "You are Bertil, the solo founder of Dafthunk, a visual workflow automation",
    "platform built on Cloudflare. You are writing to a user who signed up",
    `${ctx.daysSinceAdvance} days ago and never came back. They almost`,
    "certainly do not remember Dafthunk. Treat this as a fresh, low-key",
    "re-introduction, not a check-in. The aim is to leave the door open,",
    "not to chase. Aim for 70 to 110 words. Prose only, no bulleted lists.",
    "",
    "Structure (three short paragraphs, no headings):",
    "1. Greeting + acknowledgment: 'Hello <first name>,' on its own line,",
    "   then one sentence noting the gap matter-of-factly.",
    "2. One-line reminder + open offer: one short sentence on what Dafthunk",
    "   is (a visual way to build serverless workflows on Cloudflare), then",
    "   one sentence offering help if they want to try something. If a",
    "   relevant template is suggested, mention it by NAME only (no URL; a",
    "   link is appended) as one possible starting point.",
    "3. Closing + signature: one short, non-pressuring line, then 'Bertil'",
    "   on its own line.",
    "",
    "Subject line:",
    "- Keep it neutral and slightly formal, not a chatty check-in. Avoid",
    "  'Checking in', 'Long time no see', exclamation points, and emoji. A",
    "  short noun phrase works well (e.g., 'Dafthunk', 'Welcome back to",
    "  Dafthunk', 'A note from Dafthunk').",
    "",
    "Hard rules:",
    "- Do NOT reference 'what you were originally trying to automate' or any",
    "  specifics of their past session; they do not remember.",
    "- Do not be prescriptive or push them toward any action.",
    "",
    STYLE_RULES,
  ].join("\n");

  const system = isDormant ? dormantSystem : stuckSystem;

  // Per-user signals only. We deliberately omit org-scoped execution
  // counts and error messages from the prompt: they belong to the org,
  // not the user, and feeding them to the model produces drafts that
  // attribute teammate activity to the recipient (contradicting the
  // funnel card the admin is looking at).
  const lines: string[] = [];
  lines.push(`User first name: ${ctx.user.name || "(unknown)"}`);
  if (isDormant) {
    lines.push(`Days since signup with no activity: ${ctx.daysSinceAdvance}`);
  } else {
    lines.push(`Funnel stage: ${FUNNEL_STAGE_LABEL[ctx.furthestStage]}`);
    lines.push(`Days at this stage: ${ctx.daysSinceAdvance}`);
    if (ctx.orgWorkflowNames.length > 0) {
      lines.push("Workflows in the user's workspace (may be teammates'):");
      for (const name of ctx.orgWorkflowNames) lines.push(`- ${name}`);
    } else {
      lines.push("Workflows in the user's workspace: none");
    }
  }
  if (!isDormant && ctx.pastSupportMessages.length > 0) {
    lines.push("");
    lines.push("Past support conversation (most recent first):");
    for (const m of ctx.pastSupportMessages) {
      const who = m.direction === "inbound" ? "user" : "us";
      const when = m.createdAt.toISOString().slice(0, 10);
      lines.push(`- [${when}] ${who} re "${m.subject}": ${m.snippet}`);
    }
    lines.push(
      "Use this to avoid repeating questions we already asked or topics the user already addressed."
    );
  }
  if (template) {
    lines.push("");
    lines.push("Relevant template to suggest by name (no URL):");
    lines.push(`- Name: ${template.name}`);
    lines.push(`- Description: ${template.description}`);
  } else {
    lines.push("");
    lines.push(
      "No relevant template found — ask the user what they are trying to automate."
    );
  }

  return { system, user: lines.join("\n") };
}

// JSON Schema for the draft_email tool input. Anthropic's tool_use
// returns this object directly under `content[].input` when we force
// `tool_choice` for this tool.
const DRAFT_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    subject: { type: "string", maxLength: 200 },
    body: { type: "string", maxLength: 4000 },
    reasoning: { type: "string", maxLength: 500 },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

function coerceDraftPayload(raw: unknown): {
  subject: string;
  body: string;
  reasoning: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.subject !== "string" || typeof obj.body !== "string") {
    return null;
  }
  return {
    subject: obj.subject.trim(),
    body: obj.body.trim(),
    reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "",
  };
}

/**
 * POST /admin/onboarding/users/:id/draft-message
 *
 * Generate a personalized onboarding email draft via Workers AI. Aggregates
 * D1 user + funnel data, AE execution stats + recent errors, and ranks
 * workflow templates by token overlap with the user's activity. The admin
 * reviews and edits the draft client-side before calling the send endpoint.
 */
adminOnboardingMessageRoutes.post("/users/:id/draft-message", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
      tourCompleted: users.tourCompleted,
      workflowCreated: users.workflowCreated,
      workflowExecuted: users.workflowExecuted,
      workflowExecutedOk: users.workflowExecutedOk,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return c.json({ error: "User not found" }, 404);
  if (!user.email) return c.json({ error: "User has no email on file" }, 400);
  if (
    !c.env.CLOUDFLARE_AI_GATEWAY_ID ||
    !c.env.CLOUDFLARE_ACCOUNT_ID ||
    !c.env.CLOUDFLARE_API_TOKEN
  ) {
    return c.json(
      {
        error:
          "Cloudflare AI Gateway is not configured (need CLOUDFLARE_AI_GATEWAY_ID, ACCOUNT_ID, API_TOKEN)",
      },
      503
    );
  }

  const funnel = derivePerUserFunnel(user);
  if (funnel.furthestStage === "workflow_executed_ok") {
    return c.json(
      { error: "User has already activated; no onboarding nudge needed" },
      400
    );
  }

  const isDormant = funnel.daysSinceAdvance >= DORMANCY_DAYS;

  // Dormant path skips both secondary fetches: the prompt only needs the
  // user's name and how long they've been silent. Stuck path fetches the
  // org's workflow names (for prompt context + template scoring) and the
  // user's past support snippets, in parallel.
  const [orgWorkflows, pastSupportMessages] = isDormant
    ? [[] as { name: string }[], [] as PastSupportMessage[]]
    : await Promise.all([
        db
          .select({ name: workflows.name })
          .from(workflows)
          .where(eq(workflows.organizationId, user.organizationId))
          .orderBy(desc(workflows.updatedAt))
          .limit(10),
        fetchPastSupportMessages(db, user.id, 8),
      ]);

  const draftCtx: DraftContext = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
    },
    furthestStage: funnel.furthestStage,
    daysSinceAdvance: funnel.daysSinceAdvance,
    orgWorkflowNames: orgWorkflows.map((w) => w.name),
    pastSupportMessages,
  };

  // Template scoring matches workflow-name tokens, which we don't have
  // for dormant users — and a 350-day-old "Test" workflow wouldn't yield
  // a useful suggestion anyway.
  const template = isDormant ? null : pickTemplate(workflowTemplates, draftCtx);
  const { system, user: userPrompt } = buildPrompt(
    draftCtx,
    template,
    isDormant
  );

  // Force-call the draft_email tool so the response is a structured
  // object instead of free-form prose. More reliable than relying on the
  // model to hand-craft JSON.
  const client = new Anthropic({
    apiKey: "gateway-managed",
    timeout: 60_000,
    ...getAnthropicConfig(c.env),
  });

  let parsed: { subject: string; body: string; reasoning: string } | null;
  try {
    const response = await client.messages.create({
      model: DRAFT_MODEL,
      // 220-word target + bullets + signature + reasoning; 1500 gives
      // comfortable headroom without burning quota.
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: "draft_email",
          description:
            "Return the drafted onboarding email subject, body, and a brief reasoning for the draft.",
          input_schema: DRAFT_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "draft_email" },
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    parsed = toolUse ? coerceDraftPayload(toolUse.input) : null;
  } catch (error) {
    if (error instanceof APIError) {
      console.error("Admin onboarding draft: Anthropic API error", error);
      return c.json({ error: `Anthropic API error: ${error.message}` }, 502);
    }
    console.error("Admin onboarding draft: AI call failed", error);
    return c.json({ error: "Failed to draft message" }, 502);
  }

  if (!parsed) {
    return c.json({ error: "AI returned an unparseable draft" }, 502);
  }
  // Belt-and-braces: even with json_schema enforcement, strip CR/LF from
  // the subject before it reaches the MIME header layer.
  parsed.subject = parsed.subject.replace(/[\r\n]+/g, " ").trim();

  // Echo back ONLY the signals the model actually saw, so the admin can
  // audit the draft against its inputs without surprise: per-user funnel
  // stage, days at that stage, org workflow names (caveat: may be
  // teammates'), past support snippets (stuck only), and the suggested
  // template if any.
  return c.json({
    draft: parsed,
    context: {
      furthestStage: funnel.furthestStage,
      daysSinceAdvance: funnel.daysSinceAdvance,
      isDormant,
      orgWorkflowNames: draftCtx.orgWorkflowNames,
      pastSupportMessages: isDormant ? [] : draftCtx.pastSupportMessages,
    },
    suggestedTemplate: template
      ? {
          id: template.id,
          name: template.name,
          description: template.description,
          tryUrl: `${c.env.WEB_HOST}/templates/${template.id}`,
        }
      : null,
  });
});

// Minimal HTML escaper + paragraph wrapper. We want to send something a
// little nicer than raw text but never trust the AI-generated body to be
// HTML-safe, so we always escape first and only inject our own structure.
function bodyToHtml(
  text: string,
  template: { id: string; name: string; tryUrl: string } | null
): string {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  const cta = template
    ? `\n<p><a href="${escapeHtml(template.tryUrl)}">Try the ${escapeHtml(template.name)} template →</a></p>`
    : "";
  return `${paragraphs}${cta}`;
}

/**
 * POST /admin/onboarding/users/:id/send-message
 *
 * Persist + send the (admin-edited) draft. Mirrors `sendWelcomeEmail`:
 * open a support thread addressed to the user so any reply they send
 * threads back into `/admin/support`, then post the message via the
 * outbound support pipeline. Rolls back the thread if the send fails.
 */
adminOnboardingMessageRoutes.post("/users/:id/send-message", async (c) => {
  const db = createDatabase(c.env.DB);
  const userId = c.req.param("id");

  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      // Subject becomes a MIME header — reject CR/LF to prevent header
      // injection upstream of email-service.ts:buildThreadedMime.
      subject: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .refine((s) => !/[\r\n]/.test(s), {
          message: "Subject must not contain newlines",
        }),
      body: z.string().trim().min(1).max(8000),
      suggestedTemplateId: z.string().trim().optional(),
      includeTemplateLink: z.boolean().optional().default(false),
    })
    .safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      400
    );
  }
  const payload = parsed.data;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
      tourCompleted: users.tourCompleted,
      workflowCreated: users.workflowCreated,
      workflowExecuted: users.workflowExecuted,
      workflowExecutedOk: users.workflowExecutedOk,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return c.json({ error: "User not found" }, 404);
  if (!user.email) return c.json({ error: "User has no email on file" }, 400);

  // Re-check the funnel: a user can advance to workflow_executed_ok between
  // draft generation and send, in which case the prepared nudge would land
  // on a now-activated user. Block here to make the guard symmetric with
  // the draft endpoint.
  if (derivePerUserFunnel(user).furthestStage === "workflow_executed_ok") {
    return c.json(
      { error: "User has already activated; no onboarding nudge needed" },
      400
    );
  }

  const inbox = await getInboxByAlias(db, SUPPORT_INBOX_ALIAS);
  if (!inbox) {
    return c.json({ error: "Support inbox not configured" }, 500);
  }

  const template =
    payload.includeTemplateLink && payload.suggestedTemplateId
      ? workflowTemplates.find((t) => t.id === payload.suggestedTemplateId)
      : null;
  const templateLink = template
    ? {
        id: template.id,
        name: template.name,
        tryUrl: `${c.env.WEB_HOST}/templates/${template.id}`,
      }
    : null;

  const textBody = templateLink
    ? `${payload.body}\n\nTry the ${templateLink.name} template: ${templateLink.tryUrl}`
    : payload.body;
  const htmlBody = bodyToHtml(payload.body, templateLink);

  const recipient = user.email.toLowerCase();
  const thread = await createThread(db, {
    inboxId: inbox.id,
    subject: payload.subject,
    fromEmail: recipient,
    fromName: user.name || null,
    userId: user.id,
    organizationId: user.organizationId,
    lastMessageAt: new Date(),
  });

  const sendResult = await sendOutboundSupportMessage(
    db,
    c.env,
    c.executionCtx,
    {
      threadId: thread.id,
      inboxId: inbox.id,
      toAddress: recipient,
      subject: payload.subject,
      text: textBody,
      html: htmlBody,
      adminUserId: c.get("jwtPayload")?.sub ?? null,
    }
  );

  if (!sendResult.ok) {
    try {
      await db.delete(threads).where(eq(threads.id, thread.id));
    } catch (cleanupError) {
      console.error(
        "[admin/onboarding-message] thread cleanup failed",
        cleanupError
      );
    }
    return c.json({ error: sendResult.error }, sendResult.status);
  }

  return c.json({
    ok: true,
    threadId: thread.id,
    messageId: sendResult.messageId,
  });
});

export default adminOnboardingMessageRoutes;
