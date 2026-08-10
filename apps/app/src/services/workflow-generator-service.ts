import type {
  BriefAnswers,
  GeneratorClientMessage,
  GeneratorServerMessage,
} from "@dafthunk/types";

import { getApiBaseUrl } from "@/config/api";
import { refreshAccessToken } from "@/services/utils";

/**
 * Transport state, reported separately from anything the server says.
 *
 * "reconnecting" means retries are still pending and the screen should stay
 * exactly where it is; "lost" means the retry budget is spent. Neither says
 * anything about the *session* — the server keeps a frame log for an hour and
 * replays it on the next connect, so a lost transport is never a lost build.
 */
export type GeneratorConnectionStatus = "connected" | "reconnecting" | "lost";

export interface WorkflowGeneratorWSOptions {
  /**
   * Every server frame, in order. A single callback rather than one per frame
   * type — the page reduces frames into state, and twelve optional callbacks
   * would be a worse surface for the same thing.
   */
  onFrame?: (frame: GeneratorServerMessage) => void;
  /**
   * Transport changes only. `detail` is set when the failure has a better
   * explanation than "lost" — today that is the rate limiter, whose 429 body
   * the browser hides from the WebSocket upgrade, so it is recovered with an
   * HTTP probe and would otherwise never reach a human.
   */
  onConnectionChange?: (
    status: GeneratorConnectionStatus,
    detail?: string
  ) => void;
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
  /** The scheduled retry, so waking events can fire it early. */
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listenersAttached = false;
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
    this.attachWakeListeners();

    const wsBaseUrl = getApiBaseUrl().replace(/^http/, "ws");
    const url = `${wsBaseUrl}/${this.orgId}/generate/${this.sessionId}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.everOpened = true;
        this.options.onConnectionChange?.("connected");
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
            void this.reportLost();
          }
          return;
        }

        this.reconnectAttempts++;
        const attempt = this.reconnectAttempts;
        this.options.onConnectionChange?.("reconnecting");

        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
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
      void this.reportLost();
    }
  }

  /**
   * A fresh retry budget, on the user's say-so.
   *
   * The session is addressable for an hour after it ends, so "lost" is only
   * ever a statement about the transport — this makes trying again cost one
   * click instead of a page reload.
   */
  reconnect(): void {
    this.clearRetryTimer();
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }

  /**
   * Explains an exhausted connection, if the API can.
   *
   * The one failure with a better story than "lost" is the rate limiter: it
   * refuses the upgrade with a 429 whose body says how long to wait, and the
   * browser never surfaces an upgrade body. A plain HTTP probe of the same
   * route recovers it. Only worth doing when no handshake ever succeeded —
   * after one, the socket was healthy and the failure is genuinely transport.
   */
  private async reportLost(): Promise<void> {
    let detail: string | undefined;

    if (!this.everOpened) {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/${this.orgId}/generate/${this.sessionId}`,
          { credentials: "include" }
        );
        if (response.status === 429) {
          const body = (await response.json()) as { error?: string };
          detail = body.error;
        }
      } catch {
        // The probe is best-effort; "lost" is already true.
      }
    }

    this.options.onConnectionChange?.("lost", detail);
  }

  /** Retry now rather than at the end of the backoff. */
  private wakeAndRetry = (): void => {
    if (document.visibilityState === "hidden") return;
    if (!this.retryTimer) return;
    this.clearRetryTimer();
    this.connect();
  };

  private attachWakeListeners(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;
    // A laptop lid or a dropped network fires these long before any backoff
    // expires, and a person staring at "Reconnecting…" after reopening their
    // laptop should not be waiting out a 16-second timer.
    window.addEventListener("online", this.wakeAndRetry);
    document.addEventListener("visibilitychange", this.wakeAndRetry);
  }

  private detachWakeListeners(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;
    window.removeEventListener("online", this.wakeAndRetry);
    document.removeEventListener("visibilitychange", this.wakeAndRetry);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
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

  /** Refuse the run. An empty reason means "keep it saved, unrun". */
  decline(reason: string): void {
    this.send({ type: "decline", reason });
  }

  /** Turn the finished workflow on — restore its blanked trigger bindings. */
  arm(): void {
    this.send({ type: "arm" });
  }

  cancel(): void {
    // Never queued: a cancel that arrives after a reconnect would apply to
    // whatever the session is doing by then.
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "cancel" }));
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearRetryTimer();
    this.detachWakeListeners();
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
