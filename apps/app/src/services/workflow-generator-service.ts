import type {
  BriefAnswers,
  GeneratorClientMessage,
  GeneratorServerMessage,
} from "@dafthunk/types";

import { getApiBaseUrl } from "@/config/api";
import { refreshAccessToken } from "@/services/utils";

export interface WorkflowGeneratorWSOptions {
  /**
   * Every server frame, in order. A single callback rather than one per frame
   * type — the page reduces frames into state, and twelve optional callbacks
   * would be a worse surface for the same thing.
   */
  onFrame?: (frame: GeneratorServerMessage) => void;
  onConnectionError?: (event: Event) => void;
}

/**
 * Socket client for workflow generation.
 *
 * Modelled on `WorkflowWebSocket`, with one deliberate difference: nothing is
 * re-sent after a reconnect. The server keeps a frame log and replays it on
 * connect, so resending would risk a second run rather than catching up.
 *
 * A session is a conversation — ask, resolve, critique — so only `start`, the
 * developer page's unmediated path, keeps a one-way latch. The server is the
 * authority on which turn is legal; an out-of-turn message is ignored there
 * rather than guessed at here.
 */
export class WorkflowGeneratorWebSocket {
  private static readonly NORMAL_CLOSURE = 1000;
  private static readonly GOING_AWAY = 1001;
  private static readonly MAX_RECONNECT_DELAY = 30000;

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private shouldReconnect = true;
  /** Set once `start` has been sent for this session; never sent twice. */
  private hasStarted = false;
  /**
   * A message submitted before the socket opened.
   *
   * One slot is enough: only one turn can be in flight, and the UI disables
   * its controls while it is. Dropped on close *once the socket has opened* —
   * the server replays the session's real state on reconnect, and re-sending a
   * turn it already took would be a second run.
   */
  private pending: GeneratorClientMessage | null = null;
  /**
   * Whether this socket has ever completed a handshake.
   *
   * The distinction the `pending` rule turns on. A turn queued against a socket
   * that never opened cannot have reached the server, so there is no duplicate
   * to fear and dropping it just loses the request — which is exactly what
   * happened when the access token expired before the first connect: the
   * upgrade 401'd, the queued turn was discarded, and the reconnect landed on
   * an empty session showing a blank form.
   */
  private everOpened = false;

  constructor(
    private orgId: string,
    private sessionId: string,
    private options: WorkflowGeneratorWSOptions = {}
  ) {}

  connect(): void {
    if (this.isConnectedOrConnecting()) return;

    const wsBaseUrl = getApiBaseUrl().replace(/^http/, "ws");
    const url = `${wsBaseUrl}/${this.orgId}/generate/${this.sessionId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.everOpened = true;
        // A message submitted before the socket opened is flushed here.
        if (this.pending) {
          const message = this.pending;
          this.pending = null;
          this.send(message);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          this.options.onFrame?.(
            JSON.parse(event.data as string) as GeneratorServerMessage
          );
        } catch (error) {
          console.error("[GeneratorWS] Malformed frame:", error);
        }
      };

      // Deliberately not reported to the caller. An error is always followed
      // by a close, and the close path knows whether a retry is still coming —
      // reporting here surfaced "Lost connection." on the very first failure,
      // while five reconnects were still pending behind it.
      this.ws.onerror = (event) => {
        console.error("[GeneratorWS] Connection error:", event);
      };

      this.ws.onclose = (event) => {
        // Do not carry an unsent turn across a reconnect once the server has
        // had a chance to receive it — by the time the socket is back it
        // replays the session's real state. Before the first successful
        // handshake there is nothing to duplicate, so the turn is kept and
        // flushed by `onopen`.
        if (this.everOpened) this.pending = null;

        if (!this.shouldAttemptReconnect(event)) {
          // Out of retries, or closed on purpose. Only now is the connection
          // actually lost, and only an unclean close is worth reporting.
          if (this.shouldReconnect && !event.wasClean) {
            this.options.onConnectionError?.(new Event("error"));
          }
          return;
        }

        this.reconnectAttempts++;
        const attempt = this.reconnectAttempts;

        setTimeout(() => {
          // The access token lives five minutes, and this socket authenticates
          // by cookie at the upgrade. Anyone who spent longer than that
          // composing their request gets a 401 on the very first connect —
          // which arrives here as an ordinary close, since the browser never
          // exposes the upgrade status. So the token is refreshed before
          // retrying rather than after diagnosing, on the first attempt of a
          // burst only: if a fresh token did not fix it, it was never auth.
          if (attempt > 1) {
            this.connect();
            return;
          }
          void refreshAccessToken()
            .catch(() => false)
            .then(() => this.connect());
        }, this.reconnectDelay);

        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          WorkflowGeneratorWebSocket.MAX_RECONNECT_DELAY
        );
      };
    } catch (error) {
      console.error("[GeneratorWS] Failed to create WebSocket:", error);
      this.options.onConnectionError?.(
        new Event("error", { cancelable: false })
      );
    }
  }

  private shouldAttemptReconnect(event: CloseEvent): boolean {
    return (
      this.shouldReconnect &&
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !event.wasClean &&
      event.code !== WorkflowGeneratorWebSocket.NORMAL_CLOSURE &&
      event.code !== WorkflowGeneratorWebSocket.GOING_AWAY
    );
  }

  /** Sends now, or queues until the socket opens. */
  private send(message: GeneratorClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.pending = message;
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Build straight from a prompt, with no brief.
   *
   * Keeps its own one-way latch: the developer generate page mounts, sends
   * once, and relies on the server replaying rather than restarting. The brief
   * flow has no such latch because a session there is a conversation.
   */
  start(prompt: string): void {
    if (this.hasStarted) return;
    this.hasStarted = true;
    this.send({ type: "start", prompt });
  }

  /** Read a request back as a brief. */
  ask(prompt: string): void {
    this.send({ type: "ask", prompt });
  }

  /** Accept the brief — answered, or skipped wholesale — and build it. */
  resolve(turn: number, answers: BriefAnswers): void {
    this.send({ type: "resolve", turn, answers });
  }

  /** Say what should be different about what was just built. */
  critique(note: string): void {
    this.send({ type: "critique", note });
  }

  /** Allow the outward steps to run. */
  approve(): void {
    this.send({ type: "approve" });
  }

  /** Refuse the run, and say why so it can be corrected instead. */
  decline(reason: string): void {
    this.send({ type: "decline", reason });
  }

  cancel(): void {
    // Never queued: a cancel that arrives after a reconnect would apply to
    // whatever the session is doing by then.
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "cancel" }));
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(WorkflowGeneratorWebSocket.NORMAL_CLOSURE);
      this.ws = null;
    }
  }

  private isConnectedOrConnecting(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    );
  }
}

export const connectWorkflowGeneratorWS = (
  orgId: string,
  sessionId: string,
  options: WorkflowGeneratorWSOptions = {}
): WorkflowGeneratorWebSocket => {
  const ws = new WorkflowGeneratorWebSocket(orgId, sessionId, options);
  ws.connect();
  return ws;
};
