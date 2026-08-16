import type { IntegrationInfo } from "@dafthunk/runtime";

/**
 * Helpers for Instagram's Graph API (graph.instagram.com).
 *
 * Content publishing is a three-step dance: create a media container pointing
 * at a publicly reachable media URL, wait for Instagram to ingest it, then
 * publish the container. Media never travels through the Graph API itself —
 * Instagram downloads it from the URL — which is why the nodes presign R2
 * URLs first.
 */

export const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com/v23.0";

/** Instagram rejects captions longer than this. */
export const INSTAGRAM_CAPTION_LIMIT = 2200;

/**
 * The professional-account id recorded when the integration was connected,
 * falling back to "me" (the Graph API resolves it from the token).
 */
export function instagramUserId(integration: IntegrationInfo): string {
  const userId = integration.metadata?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : "me";
}

/**
 * Caption validation shared by the posting nodes. Returns an error message,
 * or undefined when the caption is absent or acceptable.
 */
export function captionError(caption: unknown): string | undefined {
  if (caption === undefined || caption === null) {
    return undefined;
  }
  if (typeof caption !== "string") {
    return "Caption must be a string";
  }
  if (caption.length > INSTAGRAM_CAPTION_LIMIT) {
    return `Caption is ${caption.length} characters, above Instagram's limit of ${INSTAGRAM_CAPTION_LIMIT}`;
  }
  return undefined;
}

/** Human-readable message out of a Graph API error response. */
export async function instagramErrorMessage(
  response: Response
): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as {
      error?: { message?: string; error_user_msg?: string };
    };
    return body.error?.error_user_msg ?? body.error?.message ?? text;
  } catch {
    return text;
  }
}

/**
 * Perform a Graph API request and parse the JSON response.
 * `action` names the operation in error messages ("Failed to {action}: ...").
 * Params go into the query string for GET/DELETE and the form body for POST.
 */
export async function instagramRequest<T>(
  action: string,
  path: string,
  accessToken: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", params } = options;
  const url = new URL(`${INSTAGRAM_GRAPH_BASE}/${path}`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  let body: URLSearchParams | undefined;

  if (params && method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params);
  } else if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), { method, headers, body });
  if (!response.ok) {
    throw new Error(
      `Failed to ${action}: ${await instagramErrorMessage(response)}`
    );
  }
  return (await response.json()) as T;
}

/** Create a media container and return its id. */
export async function createMediaContainer(
  userId: string,
  accessToken: string,
  params: Record<string, string>
): Promise<string> {
  const result = await instagramRequest<{ id?: string }>(
    "create Instagram media container",
    `${userId}/media`,
    accessToken,
    { method: "POST", params }
  );
  if (!result.id) {
    throw new Error("Instagram returned no media container id");
  }
  return result.id;
}

export interface ContainerStatus {
  statusCode: string;
  detail?: string;
}

/** Read a container's ingestion status. */
export async function getContainerStatus(
  containerId: string,
  accessToken: string
): Promise<ContainerStatus> {
  const result = await instagramRequest<{
    status_code?: string;
    status?: string;
  }>("check Instagram media status", containerId, accessToken, {
    params: { fields: "status_code,status" },
  });
  return { statusCode: result.status_code ?? "UNKNOWN", detail: result.status };
}

/** Publish a finished container and return the created media id. */
export async function publishMediaContainer(
  userId: string,
  accessToken: string,
  containerId: string
): Promise<string> {
  const result = await instagramRequest<{ id?: string }>(
    "publish Instagram media",
    `${userId}/media_publish`,
    accessToken,
    { method: "POST", params: { creation_id: containerId } }
  );
  if (!result.id) {
    throw new Error("Instagram returned no media id after publishing");
  }
  return result.id;
}

/** The published post's URL; undefined when the lookup fails (non-fatal). */
export async function fetchPermalink(
  mediaId: string,
  accessToken: string
): Promise<string | undefined> {
  try {
    const result = await instagramRequest<{ permalink?: string }>(
      "fetch permalink",
      mediaId,
      accessToken,
      { params: { fields: "permalink" } }
    );
    return result.permalink;
  } catch {
    return undefined;
  }
}
