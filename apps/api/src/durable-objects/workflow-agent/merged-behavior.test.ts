import { runInDurableObject } from "cloudflare:test";
import type { GeneratorServerMessage, ServerMessage } from "@dafthunk/types";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../../db";
import { memberships, organizations, users, workflows } from "../../db/schema";
import { getAgentByName } from "../agent-utils";
import {
  applyMigrations,
  openSocket,
  settle,
  testEnv,
  waitFor,
  waitForClose,
} from "./test-helpers";
import type { WorkflowAgent } from "./workflow-agent";

const NAMESPACE = testEnv.WORKFLOW_AGENT;

const ORG = "org-merged";
const USER = "user-merged";

/**
 * Behavior only the merged agent has: two protocols on one object.
 *
 * The generation protocol's own contract is covered in generation.test.ts;
 * the editor's by the app. What these tests pin down is the seam — frames
 * staying on their own protocol's sockets, generation saves reconciling the
 * editor side, the cleanup keeping the conversation while dropping the
 * replay log, and the connect guard refusing ids that already name a
 * workflow the session did not build.
 */

beforeAll(async () => {
  await applyMigrations();
  const db = createDatabase(testEnv.DB);
  await db
    .insert(organizations)
    .values({ id: ORG, name: "Merged Test Org" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({ id: USER, name: "Merged Tester", organizationId: ORG })
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values({ userId: USER, organizationId: ORG })
    .onConflictDoNothing();
});

function connectGeneration(workflowId: string, organizationId = ORG) {
  return openSocket<GeneratorServerMessage>(workflowId, "generation", {
    "X-User-Id": USER,
    "X-Organization-Id": organizationId,
  });
}

function connectEditor(workflowId: string) {
  return openSocket<ServerMessage>(workflowId, "editor", {
    "X-User-Id": USER,
  });
}

/** A minimal record the host save path accepts. */
function record(workflowId: string, name: string) {
  return {
    id: workflowId,
    name,
    trigger: "manual",
    runtime: "workflow",
    organizationId: ORG,
    nodes: [],
    edges: [],
  };
}

/** Row counts of the three generation tables, read inside the object. */
function genTableCounts(state: DurableObjectState) {
  const count = (table: string) =>
    Number(
      state.storage.sql.exec(`SELECT COUNT(*) AS n FROM ${table}`).one().n ?? 0
    );
  return {
    frames: count("gen_frames"),
    turns: count("gen_turns"),
    runs: count("gen_runs"),
  };
}

describe("two protocols on one object", () => {
  it("keeps each protocol's frames off the other's sockets", async () => {
    const id = "merged-isolation";
    const stub = await getAgentByName(NAMESPACE, id);

    // The real creation order: the generation session opens before any
    // workflow exists, the save makes the editor side reachable.
    const generation = await connectGeneration(id);
    await waitFor(generation.frames, (f) => f.type === "session");

    await runInDurableObject(
      stub,
      async (instance: WorkflowAgent, state: DurableObjectState) => {
        // A run parked on the approval question, whose continuation is gone —
        // the one generation move that emits a frame without a model call.
        state.storage.sql.exec(
          `INSERT INTO gen_runs (session_id, status, prompt, turn, updated_at) VALUES (?, 'awaiting', 'test', 0, ?)`,
          id,
          Date.now()
        );
        await instance.saveWorkflowRecord(record(id, "Isolation Workflow"));
      }
    );

    const editor = await connectEditor(id);
    await waitFor(editor.frames, (f) => f.type === "init");
    const editorFramesBefore = editor.frames.length;

    // Generation emits an error frame (approve with no pending continuation).
    generation.socket.send(JSON.stringify({ type: "approve" }));
    await waitFor(generation.frames, (f) => f.type === "error");

    // The editor client closes on any unknown frame type, so a single leaked
    // generator frame here is a killed session in production.
    await settle();
    expect(editor.frames.length).toBe(editorFramesBefore);

    // And the other direction: an editor update stays off generation sockets.
    const generationFramesBefore = generation.frames.length;
    editor.socket.send(
      JSON.stringify({
        type: "update",
        state: {
          id,
          name: "Isolation Workflow",
          trigger: "manual",
          runtime: "workflow",
          nodes: [],
          edges: [],
          timestamp: Date.now(),
        },
      })
    );
    await settle();
    expect(generation.frames.length).toBe(generationFramesBefore);
  });

  it("reconciles an open editor session with what generation saves", async () => {
    const id = "merged-write-race";
    const stub = await getAgentByName(NAMESPACE, id);

    await runInDurableObject(stub, async (instance: WorkflowAgent) => {
      await instance.saveWorkflowRecord(record(id, "Original"));
    });

    const editor = await connectEditor(id);
    await waitFor(editor.frames, (f) => f.type === "init");

    // A hand edit: snapshots dirty state and arms the 500ms debounced persist.
    editor.socket.send(
      JSON.stringify({
        type: "update",
        state: {
          id,
          name: "Edited By Hand",
          trigger: "manual",
          runtime: "workflow",
          nodes: [],
          edges: [],
          timestamp: Date.now(),
        },
      })
    );
    await settle();

    // The generation save lands while that persist is still queued.
    await runInDurableObject(stub, async (instance: WorkflowAgent) => {
      await instance.saveWorkflowRecord(record(id, "Generated"));
    });

    // The open editor tab converges on the generation's graph...
    await waitFor(
      editor.frames,
      (f) => f.type === "update" && f.state.name === "Generated"
    );

    // ...and the queued stale persist does not clobber the save. The window
    // it could fire in is the debounce; wait it out before reading.
    await scheduler.wait(700);
    const db = createDatabase(testEnv.DB);
    const [row] = await db
      .select({ name: workflows.name })
      .from(workflows)
      .where(eq(workflows.id, id));
    expect(row?.name).toBe("Generated");
  });
});

describe("conversation retention", () => {
  it("prunes the replay log but keeps the conversation and its pointer", async () => {
    const id = "merged-retention";
    const stub = await getAgentByName(NAMESPACE, id);

    const first = await connectGeneration(id);
    await waitFor(first.frames, (f) => f.type === "session");

    const counts = await runInDurableObject(
      stub,
      async (instance: WorkflowAgent, state: DurableObjectState) => {
        const sql = state.storage.sql;
        sql.exec(
          `INSERT INTO gen_runs (session_id, status, prompt, turn, updated_at, workflow_id, execution_id) VALUES (?, 'done', 'built it', 0, ?, ?, 'exec-1')`,
          id,
          Date.now(),
          id
        );
        sql.exec(
          `INSERT INTO gen_frames (session_id, frame) VALUES (?, '{"type":"log","level":"info","message":"one"}')`,
          id
        );
        sql.exec(
          `INSERT INTO gen_frames (session_id, frame) VALUES (?, '{"type":"log","level":"info","message":"two"}')`,
          id
        );
        sql.exec(
          `INSERT INTO gen_turns (session_id, turn, system, messages) VALUES (?, 0, 'system', '[]')`,
          id
        );

        await instance.generationCleanupCallback();

        return genTableCounts(state);
      }
    );

    expect(counts).toEqual({ frames: 0, turns: 1, runs: 1 });

    // A visitor arriving after the prune: no replay, but the session frame
    // still points at what was built.
    first.socket.close();
    const second = await connectGeneration(id);
    const session = await waitFor(second.frames, (f) => f.type === "session");
    expect(session).toMatchObject({
      type: "session",
      status: "done",
      workflowId: id,
      executionId: "exec-1",
    });
    await settle();
    expect(second.frames).toHaveLength(1);
  });

  it("empties every generation table for a session that never saved", async () => {
    const id = "merged-orphan";
    const stub = await getAgentByName(NAMESPACE, id);

    const first = await connectGeneration(id);
    await waitFor(first.frames, (f) => f.type === "session");

    const counts = await runInDurableObject(
      stub,
      async (instance: WorkflowAgent, state: DurableObjectState) => {
        state.storage.sql.exec(
          `INSERT INTO gen_runs (session_id, status, prompt, turn, updated_at) VALUES (?, 'failed', 'abandoned', 0, ?)`,
          id,
          Date.now()
        );
        await instance.generationCleanupCallback();
        return genTableCounts(state);
      }
    );

    expect(counts).toEqual({ frames: 0, turns: 0, runs: 0 });

    // A later visitor finds a fresh session, not the ghost of this one.
    first.socket.close();
    const second = await connectGeneration(id);
    const session = await waitFor(second.frames, (f) => f.type === "session");
    expect(session).toMatchObject({ type: "session", status: "idle" });
  });
});

describe("the connect guard", () => {
  it("refuses a generation connect against another org's workflow", async () => {
    const id = "merged-hijack-cross-org";
    const stub = await getAgentByName(NAMESPACE, id);
    await runInDurableObject(stub, async (instance: WorkflowAgent) => {
      await instance.saveWorkflowRecord(record(id, "Someone Else's"));
    });

    const probe = await connectGeneration(id, "org-other");
    await expect(waitForClose(probe.socket)).resolves.toBe(1008);
  });

  it("refuses a generation connect against a workflow the session did not build", async () => {
    const id = "merged-hijack-same-org";
    const stub = await getAgentByName(NAMESPACE, id);
    // The workflow exists in this org, but there is no generation run behind
    // it — an editor-made workflow. Conversing about it is a future feature
    // with deliberate seeding, not something a pasted URL should trigger.
    await runInDurableObject(stub, async (instance: WorkflowAgent) => {
      await instance.saveWorkflowRecord(record(id, "Editor Made"));
    });

    const probe = await connectGeneration(id, ORG);
    await expect(waitForClose(probe.socket)).resolves.toBe(1008);
  });
});
