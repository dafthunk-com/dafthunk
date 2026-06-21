/**
 * Mailbox Durable Object
 *
 * One instance per organization (keyed `mailbox:<orgId>`). Holds the
 * thread/message metadata for every per-org email address in its own embedded
 * SQLite — keeping mail history out of the shared D1 and isolating each org's
 * data. Raw MIME, bodies, and attachments live in R2 (`INBOXES`); only the
 * index and threading state live here. Threads are scoped per address via
 * `email_id`.
 *
 * The DO's single-threaded execution serialises concurrent inbound mail to the
 * same org, so thread resolution never races.
 *
 * Methods are invoked as RPC over the stub (see CloudflareMailboxService).
 */

import { DurableObject } from "cloudflare:workers";
import { v7 as uuidv7 } from "uuid";

import type { Bindings } from "../context";
import { normalizeSubject } from "../support-utils";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface MailboxAttachmentInput {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  r2Key: string;
  contentId: string | null;
}

export interface IngestInboundArgs {
  emailId: string;
  messageId: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  rfc822MessageId: string;
  inReplyTo: string | null;
  references: string[];
  referencesChain: string | null;
  snippet: string;
  hasHtml: boolean;
  hasText: boolean;
  rawR2Key: string;
  attachments: MailboxAttachmentInput[];
  /** Thread id resolved from a verified reply-token; short-circuits matching. */
  verifiedThreadId?: string | null;
}

export interface InsertOutboundArgs {
  emailId: string;
  threadId: string;
  messageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  rfc822MessageId: string;
  inReplyTo: string | null;
  referencesChain: string | null;
  snippet: string;
  hasHtml: boolean;
  hasText: boolean;
  rawR2Key: string;
}

export interface MailboxThreadRow {
  id: string;
  emailId: string;
  subject: string;
  fromEmail: string;
  lastMessageAt: number;
  createdAt: number;
}

export interface MailboxMessageRow {
  id: string;
  direction: "inbound" | "outbound";
  fromEmail: string;
  toEmail: string;
  subject: string;
  snippet: string;
  rfc822MessageId: string;
  inReplyTo: string | null;
  referencesChain: string | null;
  hasHtml: boolean;
  hasText: boolean;
  attachmentCount: number;
  createdAt: number;
}

export class MailboxDO extends DurableObject<Bindings> {
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  private ensureSchema(): void {
    if (this.initialized) return;
    const sql = this.ctx.storage.sql;

    sql.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id              TEXT PRIMARY KEY,
        email_id        TEXT NOT NULL,
        subject         TEXT NOT NULL,
        from_email      TEXT NOT NULL,
        from_name       TEXT,
        archived_at     INTEGER,
        last_message_at INTEGER NOT NULL,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        agent_run_id    TEXT
      )
    `);
    // Backfill the column on mailboxes created before email-agent support.
    const threadCols = sql
      .exec(`PRAGMA table_info(threads)`)
      .toArray() as Record<string, unknown>[];
    if (!threadCols.some((c) => c.name === "agent_run_id")) {
      sql.exec(`ALTER TABLE threads ADD COLUMN agent_run_id TEXT`);
    }
    sql.exec(
      `CREATE INDEX IF NOT EXISTS threads_email_id_idx ON threads(email_id)`
    );
    sql.exec(
      `CREATE INDEX IF NOT EXISTS threads_from_email_idx ON threads(from_email)`
    );
    sql.exec(
      `CREATE INDEX IF NOT EXISTS threads_last_message_at_idx ON threads(last_message_at)`
    );

    sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id                TEXT PRIMARY KEY,
        thread_id         TEXT NOT NULL,
        email_id          TEXT NOT NULL,
        direction         TEXT NOT NULL,
        rfc822_message_id TEXT NOT NULL,
        in_reply_to       TEXT,
        references_chain  TEXT,
        from_email        TEXT NOT NULL,
        to_email          TEXT NOT NULL,
        subject           TEXT NOT NULL,
        snippet           TEXT NOT NULL DEFAULT '',
        has_html          INTEGER NOT NULL DEFAULT 0,
        has_text          INTEGER NOT NULL DEFAULT 0,
        attachment_count  INTEGER NOT NULL DEFAULT 0,
        raw_r2_key        TEXT NOT NULL,
        created_at        INTEGER NOT NULL
      )
    `);
    sql.exec(
      `CREATE INDEX IF NOT EXISTS messages_thread_id_idx ON messages(thread_id)`
    );
    sql.exec(
      `CREATE INDEX IF NOT EXISTS messages_rfc822_idx ON messages(email_id, rfc822_message_id)`
    );

    sql.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id           TEXT PRIMARY KEY,
        message_id   TEXT NOT NULL,
        filename     TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size_bytes   INTEGER NOT NULL,
        r2_key       TEXT NOT NULL,
        content_id   TEXT
      )
    `);
    sql.exec(
      `CREATE INDEX IF NOT EXISTS attachments_message_id_idx ON attachments(message_id)`
    );

    this.initialized = true;
  }

  /**
   * Persist an inbound message, attaching it to an existing thread or creating
   * a new one. Mirrors the support inbox's `resolveThreadForInbound` heuristic:
   * RFC 5322 In-Reply-To / References first, then normalized subject +
   * fromEmail within 30 days, else a new thread. A verified reply-token short-
   * circuits resolution.
   */
  async ingestInbound(args: IngestInboundArgs): Promise<{
    threadId: string;
    messageId: string;
    /** EmailAgentRunner that owns this thread, if it's an agent conversation. */
    agentRunId: string | null;
  }> {
    this.ensureSchema();
    const now = Date.now();
    const threadId = this.resolveThread(args) ?? this.createThread(args, now);

    // Bump activity + un-archive on any new inbound message.
    this.ctx.storage.sql.exec(
      `UPDATE threads SET last_message_at = ?, archived_at = NULL, updated_at = ? WHERE id = ?`,
      now,
      now,
      threadId
    );

    this.insertMessageRow({
      id: args.messageId,
      threadId,
      emailId: args.emailId,
      direction: "inbound",
      rfc822MessageId: args.rfc822MessageId,
      inReplyTo: args.inReplyTo,
      referencesChain: args.referencesChain,
      fromEmail: args.fromEmail,
      toEmail: args.toEmail,
      subject: args.subject,
      snippet: args.snippet,
      hasHtml: args.hasHtml,
      hasText: args.hasText,
      attachmentCount: args.attachments.length,
      rawR2Key: args.rawR2Key,
      createdAt: now,
    });

    for (const att of args.attachments) {
      this.ctx.storage.sql.exec(
        `INSERT INTO attachments (id, message_id, filename, content_type, size_bytes, r2_key, content_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        att.id,
        args.messageId,
        att.filename,
        att.contentType,
        att.sizeBytes,
        att.r2Key,
        att.contentId
      );
    }

    const agentRunId = this.threadAgentRunId(threadId);
    return { threadId, messageId: args.messageId, agentRunId };
  }

  /**
   * Tag (or clear) the EmailAgentRunner that owns a thread. An owned thread's
   * inbound replies are routed to that run instead of triggering workflows;
   * pass `null` to release ownership when the run finishes.
   */
  async setThreadAgentRun(
    threadId: string,
    runId: string | null
  ): Promise<void> {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      `UPDATE threads SET agent_run_id = ?, updated_at = ? WHERE id = ?`,
      runId,
      Date.now(),
      threadId
    );
  }

  /** Pre-insert an outbound message before the send is attempted. */
  async insertOutbound(
    args: InsertOutboundArgs
  ): Promise<{ messageId: string }> {
    this.ensureSchema();
    const now = Date.now();
    this.insertMessageRow({
      id: args.messageId,
      threadId: args.threadId,
      emailId: args.emailId,
      direction: "outbound",
      rfc822MessageId: args.rfc822MessageId,
      inReplyTo: args.inReplyTo,
      referencesChain: args.referencesChain,
      fromEmail: args.fromEmail,
      toEmail: args.toEmail,
      subject: args.subject,
      snippet: args.snippet,
      hasHtml: args.hasHtml,
      hasText: args.hasText,
      attachmentCount: 0,
      rawR2Key: args.rawR2Key,
      createdAt: now,
    });
    return { messageId: args.messageId };
  }

  /** Bump a thread's activity timestamp (after a successful outbound send). */
  async touchThread(threadId: string): Promise<void> {
    this.ensureSchema();
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `UPDATE threads SET last_message_at = ?, updated_at = ? WHERE id = ?`,
      now,
      now,
      threadId
    );
  }

  /** Roll back a pre-inserted message when its send fails. */
  async deleteMessage(messageId: string): Promise<void> {
    this.ensureSchema();
    this.ctx.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, messageId);
  }

  /**
   * Retention hook (not yet scheduled): delete threads with no activity since
   * `cutoffMs`, along with their messages and attachments. Returns the R2 key
   * prefixes (`<emailId>/<messageId>`) of the removed messages so a caller can
   * purge the corresponding raw/body/attachment blobs from the INBOXES bucket
   * (`R2.delete` over `list({ prefix })`). Metadata is removed here; blob
   * cleanup is the caller's responsibility so this stays storage-binding free.
   */
  async pruneInactiveThreads(
    cutoffMs: number
  ): Promise<{ r2Prefixes: string[] }> {
    this.ensureSchema();
    const sql = this.ctx.storage.sql;
    const stale = sql
      .exec(`SELECT id FROM threads WHERE last_message_at < ?`, cutoffMs)
      .toArray() as Record<string, unknown>[];
    if (stale.length === 0) return { r2Prefixes: [] };

    const r2Prefixes: string[] = [];
    for (const t of stale) {
      const threadId = t.id as string;
      const msgs = sql
        .exec(`SELECT id, email_id FROM messages WHERE thread_id = ?`, threadId)
        .toArray() as Record<string, unknown>[];
      for (const m of msgs) {
        r2Prefixes.push(`${m.email_id as string}/${m.id as string}`);
        sql.exec(
          `DELETE FROM attachments WHERE message_id = ?`,
          m.id as string
        );
      }
      sql.exec(`DELETE FROM messages WHERE thread_id = ?`, threadId);
      sql.exec(`DELETE FROM threads WHERE id = ?`, threadId);
    }
    return { r2Prefixes };
  }

  /**
   * Create an empty thread up-front (used by send-from-scratch). Returns the
   * new thread id.
   */
  async createOutboundThread(args: {
    emailId: string;
    subject: string;
    /** Conversation peer (the recipient). Used for subject-fallback matching. */
    fromEmail: string;
  }): Promise<{ threadId: string }> {
    this.ensureSchema();
    const now = Date.now();
    const threadId = this.createThread(
      {
        emailId: args.emailId,
        subject: args.subject,
        fromEmail: args.fromEmail,
      },
      now
    );
    return { threadId };
  }

  async getThread(threadId: string): Promise<MailboxThreadRow | undefined> {
    this.ensureSchema();
    const rows = this.ctx.storage.sql
      .exec(
        `SELECT id, email_id, subject, from_email, last_message_at, created_at
         FROM threads WHERE id = ? LIMIT 1`,
        threadId
      )
      .toArray() as Record<string, unknown>[];
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r.id as string,
      emailId: r.email_id as string,
      subject: r.subject as string,
      fromEmail: r.from_email as string,
      lastMessageAt: Number(r.last_message_at),
      createdAt: Number(r.created_at),
    };
  }

  async listThreadMessages(threadId: string): Promise<MailboxMessageRow[]> {
    this.ensureSchema();
    const rows = this.ctx.storage.sql
      .exec(
        `SELECT id, direction, from_email, to_email, subject, snippet,
                rfc822_message_id, in_reply_to, references_chain,
                has_html, has_text, attachment_count, created_at
         FROM messages WHERE thread_id = ? ORDER BY created_at ASC`,
        threadId
      )
      .toArray() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      direction: r.direction as "inbound" | "outbound",
      fromEmail: r.from_email as string,
      toEmail: r.to_email as string,
      subject: r.subject as string,
      snippet: r.snippet as string,
      rfc822MessageId: r.rfc822_message_id as string,
      inReplyTo: (r.in_reply_to as string | null) ?? null,
      referencesChain: (r.references_chain as string | null) ?? null,
      hasHtml: Boolean(r.has_html),
      hasText: Boolean(r.has_text),
      attachmentCount: Number(r.attachment_count),
      createdAt: Number(r.created_at),
    }));
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private threadAgentRunId(threadId: string): string | null {
    const rows = this.ctx.storage.sql
      .exec(`SELECT agent_run_id FROM threads WHERE id = ? LIMIT 1`, threadId)
      .toArray() as Record<string, unknown>[];
    return (rows[0]?.agent_run_id as string | null) ?? null;
  }

  private resolveThread(args: IngestInboundArgs): string | undefined {
    const sql = this.ctx.storage.sql;

    if (args.verifiedThreadId) {
      const hit = sql
        .exec(
          `SELECT id FROM threads WHERE id = ? LIMIT 1`,
          args.verifiedThreadId
        )
        .toArray();
      if (hit.length > 0) return args.verifiedThreadId;
    }

    const candidateRfcIds = [
      ...(args.inReplyTo ? [args.inReplyTo] : []),
      ...args.references,
    ];
    if (candidateRfcIds.length > 0) {
      const placeholders = candidateRfcIds.map(() => "?").join(", ");
      const hits = sql
        .exec(
          `SELECT thread_id FROM messages
           WHERE email_id = ? AND rfc822_message_id IN (${placeholders})
           LIMIT 1`,
          args.emailId,
          ...candidateRfcIds
        )
        .toArray() as Record<string, unknown>[];
      if (hits.length > 0) return hits[0].thread_id as string;
    }

    const normalized = normalizeSubject(args.subject);
    if (!normalized) return undefined;

    const since = Date.now() - THIRTY_DAYS_MS;
    const candidates = sql
      .exec(
        `SELECT id, subject FROM threads
         WHERE email_id = ? AND from_email = ? AND last_message_at >= ?
         ORDER BY last_message_at DESC LIMIT 20`,
        args.emailId,
        args.fromEmail,
        since
      )
      .toArray() as Record<string, unknown>[];
    const match = candidates.find(
      (t) => normalizeSubject(t.subject as string) === normalized
    );
    return match ? (match.id as string) : undefined;
  }

  private createThread(
    args: {
      emailId: string;
      subject: string;
      fromEmail: string;
      fromName?: string | null;
    },
    now: number
  ): string {
    const threadId = uuidv7();
    this.ctx.storage.sql.exec(
      `INSERT INTO threads (id, email_id, subject, from_email, from_name, archived_at, last_message_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      threadId,
      args.emailId,
      args.subject,
      args.fromEmail,
      args.fromName ?? null,
      now,
      now,
      now
    );
    return threadId;
  }

  private insertMessageRow(row: {
    id: string;
    threadId: string;
    emailId: string;
    direction: "inbound" | "outbound";
    rfc822MessageId: string;
    inReplyTo: string | null;
    referencesChain: string | null;
    fromEmail: string;
    toEmail: string;
    subject: string;
    snippet: string;
    hasHtml: boolean;
    hasText: boolean;
    attachmentCount: number;
    rawR2Key: string;
    createdAt: number;
  }): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO messages (
         id, thread_id, email_id, direction, rfc822_message_id, in_reply_to,
         references_chain, from_email, to_email, subject, snippet, has_html,
         has_text, attachment_count, raw_r2_key, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.id,
      row.threadId,
      row.emailId,
      row.direction,
      row.rfc822MessageId,
      row.inReplyTo,
      row.referencesChain,
      row.fromEmail,
      row.toEmail,
      row.subject,
      row.snippet,
      row.hasHtml ? 1 : 0,
      row.hasText ? 1 : 0,
      row.attachmentCount,
      row.rawR2Key,
      row.createdAt
    );
  }
}
