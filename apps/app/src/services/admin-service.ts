import useSWR from "swr";

import { getApiBaseUrl } from "@/config/api";

import { makeRequest } from "./utils";

// Admin API base endpoint
const ADMIN_API_ENDPOINT = "/admin";

// Response types
export interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalWorkflows: number;
  recentSignups: number;
  activeUsers24h: number;
  funnel: AdminStatsFunnel;
  timeseries: AdminStatsTimeseries;
}

export interface AdminStatsFunnel {
  signedUp: number;
  tourCompleted: number;
  workflowCreated: number;
  workflowExecuted: number;
  workflowExecutedOk: number;
}

export type OnboardingStage =
  | "signed_up"
  | "tour_completed"
  | "workflow_created"
  | "workflow_executed"
  | "workflow_executed_ok";

// Canonical funnel order. Used both for rendering and to derive the furthest
// stage a user has reached from their stamp columns.
export const ONBOARDING_STAGES: OnboardingStage[] = [
  "signed_up",
  "tour_completed",
  "workflow_created",
  "workflow_executed",
  "workflow_executed_ok",
];

export const ONBOARDING_STAGE_LABEL: Record<OnboardingStage, string> = {
  signed_up: "Signed up",
  tour_completed: "Tour completed",
  workflow_created: "Workflow created",
  workflow_executed: "Workflow executed",
  workflow_executed_ok: "Successful execution",
};

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  plan: string;
  role: string;
  developerMode: boolean;
  tourCompleted: Date | null;
  workflowCreated: Date | null;
  workflowExecuted: Date | null;
  workflowExecutedOk: Date | null;
  furthestStage: OnboardingStage;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserDetail extends AdminUser {
  githubId: string | null;
  googleId: string | null;
}

export interface AdminUserFunnelStage {
  reached: boolean;
  at: Date | null;
}

export interface AdminUserFunnel {
  signedUp: AdminUserFunnelStage;
  tourCompleted: AdminUserFunnelStage;
  workflowCreated: AdminUserFunnelStage;
  workflowExecuted: AdminUserFunnelStage;
  workflowExecutedOk: AdminUserFunnelStage;
  furthestStage: OnboardingStage;
  daysSinceAdvance: number;
}

export interface AdminUserExecutionsSummary {
  firstExecutionAt: Date | null;
  firstSuccessAt: Date | null;
  totalExecutions: number;
  successCount: number;
  errorCount: number;
}

export interface DailyCountPoint {
  date: string;
  count: number;
}

export interface DailyExecutionPoint extends DailyCountPoint {
  successCount: number;
  errorCount: number;
}

export interface AdminStatsTimeseries {
  range: { from: string; to: string; days: number };
  series: {
    signups: DailyCountPoint[];
    workflowsCreated: DailyCountPoint[];
    executions: DailyExecutionPoint[];
  };
}

export interface AdminUserMembership {
  organizationId: string;
  organizationName: string;
  role: string;
  joinedAt: Date;
}

export interface AdminOrganization {
  id: string;
  name: string;
  computeCredits: number;
  subscriptionStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  workflowCount: number;
}

export interface AdminOrganizationDetail {
  id: string;
  name: string;
  computeCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  overageLimit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminOrganizationMember {
  userId: string;
  userName: string;
  userEmail: string | null;
  userAvatarUrl: string | null;
  role: string;
  joinedAt: Date;
}

export interface AdminOrganizationEntityCounts {
  workflowCount: number;
  emailCount: number;
  queueCount: number;
  datasetCount: number;
  databaseCount: number;
}

export interface AdminWorkflow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  runtime: string;
  organizationId: string;
  organizationName: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminWorkflowDetail extends AdminWorkflow {
  nodes: any[];
  edges: any[];
}

export interface AdminExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  organizationName: string;
  status: string;
  error?: string;
  startedAt: Date;
  endedAt: Date;
  usage: number;
}

export interface AdminNodeExecution {
  nodeId: string;
  status: string;
  error?: string;
  outputs?: Record<string, unknown>;
  usage: number;
}

export interface AdminExecutionDetail extends AdminExecution {
  nodeExecutions: AdminNodeExecution[];
}

export interface AdminEmail {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminQueue {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDataset {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDatabase {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const AdminMessageDirection = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
} as const;
export type AdminMessageDirection =
  (typeof AdminMessageDirection)[keyof typeof AdminMessageDirection];

export type AdminThreadView = "inbox" | "archived" | "all";

export interface AdminThreadSummary {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  archivedAt: Date | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  organizationId: string | null;
  organizationName: string | null;
  unread: boolean;
}

export interface AdminThreadAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  contentId: string | null;
}

export interface AdminThreadMessage {
  id: string;
  threadId: string;
  direction: AdminMessageDirection;
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
  authorAdminUserId: string | null;
  createdAt: Date;
  attachments: AdminThreadAttachment[];
}

export interface AdminThreadDetail {
  thread: AdminThreadSummary;
  messages: AdminThreadMessage[];
}

// Hooks

/**
 * Hook to fetch admin dashboard statistics (counters + time-series)
 */
export const useAdminStats = (days = 30) => {
  const swrKey = `${ADMIN_API_ENDPOINT}/stats?days=${days}`;
  const { data, error, isLoading, mutate } = useSWR<AdminStats>(
    swrKey,
    async () => makeRequest<AdminStats>(swrKey)
  );

  return {
    stats: data || null,
    statsError: error || null,
    isStatsLoading: isLoading,
    mutateStats: mutate,
  };
};

/**
 * Hook to fetch admin users list
 */
export const useAdminUsers = (page = 1, limit = 20, search?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    users: AdminUser[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/users?${params}`, async () =>
    makeRequest<{ users: AdminUser[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/users?${params}`
    )
  );

  return {
    users: data?.users || [],
    pagination: data?.pagination || null,
    usersError: error || null,
    isUsersLoading: isLoading,
    mutateUsers: mutate,
  };
};

/**
 * Hook to fetch admin user detail
 */
export const useAdminUserDetail = (userId: string | undefined) => {
  const { data, error, isLoading, mutate } = useSWR<{
    user: AdminUserDetail;
    memberships: AdminUserMembership[];
  }>(userId ? `${ADMIN_API_ENDPOINT}/users/${userId}` : null, async () =>
    makeRequest<{ user: AdminUserDetail; memberships: AdminUserMembership[] }>(
      `${ADMIN_API_ENDPOINT}/users/${userId}`
    )
  );

  return {
    user: data?.user || null,
    memberships: data?.memberships || [],
    userError: error || null,
    isUserLoading: isLoading,
    mutateUser: mutate,
  };
};

/**
 * Hook to fetch a user's onboarding funnel (D1-only, fast)
 */
export const useAdminUserFunnel = (userId: string | undefined) => {
  const swrKey = userId
    ? `${ADMIN_API_ENDPOINT}/onboarding/users/${userId}/funnel`
    : null;
  const { data, error, isLoading, mutate } = useSWR<AdminUserFunnel>(
    swrKey,
    swrKey ? async () => makeRequest<AdminUserFunnel>(swrKey) : null
  );

  return {
    funnel: data || null,
    funnelError: error || null,
    isFunnelLoading: isLoading,
    mutateFunnel: mutate,
  };
};

/**
 * Hook to fetch a user's execution summary (Analytics Engine, slower)
 */
export const useAdminUserExecutionsSummary = (userId: string | undefined) => {
  const swrKey = userId
    ? `${ADMIN_API_ENDPOINT}/onboarding/users/${userId}/executions-summary`
    : null;
  const { data, error, isLoading, mutate } = useSWR<AdminUserExecutionsSummary>(
    swrKey,
    swrKey ? async () => makeRequest<AdminUserExecutionsSummary>(swrKey) : null
  );

  return {
    executionsSummary: data || null,
    executionsSummaryError: error || null,
    isExecutionsSummaryLoading: isLoading,
    mutateExecutionsSummary: mutate,
  };
};

/**
 * Resend the welcome email to a user. The server creates a fresh support
 * thread so the message shows up in the inbox view (matching the signup flow).
 */
export const resendAdminUserWelcomeEmail = async (
  userId: string
): Promise<{ ok: true }> => {
  return makeRequest<{ ok: true }>(
    `${ADMIN_API_ENDPOINT}/users/${userId}/welcome-email`,
    { method: "POST" }
  );
};

/**
 * Hook to fetch admin organizations list
 */
export const useAdminOrganizations = (
  page = 1,
  limit = 20,
  search?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    organizations: AdminOrganization[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/organizations?${params}`, async () =>
    makeRequest<{
      organizations: AdminOrganization[];
      pagination: PaginationInfo;
    }>(`${ADMIN_API_ENDPOINT}/organizations?${params}`)
  );

  return {
    organizations: data?.organizations || [],
    pagination: data?.pagination || null,
    organizationsError: error || null,
    isOrganizationsLoading: isLoading,
    mutateOrganizations: mutate,
  };
};

/**
 * Hook to fetch admin organization detail
 */
export const useAdminOrganizationDetail = (
  organizationId: string | undefined
) => {
  const { data, error, isLoading, mutate } = useSWR<{
    organization: AdminOrganizationDetail;
    members: AdminOrganizationMember[];
    stats: { workflowCount: number; memberCount: number };
  }>(
    organizationId
      ? `${ADMIN_API_ENDPOINT}/organizations/${organizationId}`
      : null,
    async () =>
      makeRequest<{
        organization: AdminOrganizationDetail;
        members: AdminOrganizationMember[];
        stats: { workflowCount: number; memberCount: number };
      }>(`${ADMIN_API_ENDPOINT}/organizations/${organizationId}`)
  );

  return {
    organization: data?.organization || null,
    members: data?.members || [],
    stats: data?.stats || null,
    organizationError: error || null,
    isOrganizationLoading: isLoading,
    mutateOrganization: mutate,
  };
};

/**
 * Hook to fetch entity counts for an organization
 */
export const useAdminOrganizationEntityCounts = (
  organizationId: string | undefined
) => {
  const { data, error, isLoading, mutate } =
    useSWR<AdminOrganizationEntityCounts>(
      organizationId
        ? `${ADMIN_API_ENDPOINT}/organizations/${organizationId}/entity-counts`
        : null,
      async () =>
        makeRequest<AdminOrganizationEntityCounts>(
          `${ADMIN_API_ENDPOINT}/organizations/${organizationId}/entity-counts`
        )
    );

  return {
    entityCounts: data || null,
    entityCountsError: error || null,
    isEntityCountsLoading: isLoading,
    mutateEntityCounts: mutate,
  };
};

/**
 * Hook to fetch admin workflows list
 */
export const useAdminWorkflows = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    workflows: AdminWorkflow[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/workflows?${params}`, async () =>
    makeRequest<{ workflows: AdminWorkflow[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/workflows?${params}`
    )
  );

  return {
    workflows: data?.workflows || [],
    pagination: data?.pagination || null,
    workflowsError: error || null,
    isWorkflowsLoading: isLoading,
    mutateWorkflows: mutate,
  };
};

/**
 * Hook to fetch a single admin workflow including its nodes/edges, so the
 * detail page can render with one round-trip.
 */
export const useAdminWorkflowDetail = (workflowId: string | undefined) => {
  const swrKey = workflowId
    ? `${ADMIN_API_ENDPOINT}/workflows/${workflowId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    workflow: AdminWorkflowDetail;
  }>(
    swrKey,
    swrKey
      ? async () => makeRequest<{ workflow: AdminWorkflowDetail }>(swrKey)
      : null
  );

  return {
    workflow: data?.workflow || null,
    workflowError: error || null,
    isWorkflowLoading: isLoading,
    mutateWorkflow: mutate,
  };
};

/**
 * Hook to fetch admin executions list
 */
export const useAdminExecutions = (
  page = 1,
  limit = 20,
  organizationId?: string,
  workflowId?: string,
  status?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(organizationId && { organizationId }),
    ...(workflowId && { workflowId }),
    ...(status && { status }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    executions: AdminExecution[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/executions?${params}`, async () =>
    makeRequest<{ executions: AdminExecution[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/executions?${params}`
    )
  );

  return {
    executions: data?.executions || [],
    pagination: data?.pagination || null,
    executionsError: error || null,
    isExecutionsLoading: isLoading,
    mutateExecutions: mutate,
  };
};

/**
 * Hook to fetch admin execution detail
 */
export const useAdminExecutionDetail = (
  executionId: string | undefined,
  organizationId: string | undefined
) => {
  const { data, error, isLoading, mutate } = useSWR<{
    execution: AdminExecutionDetail;
  }>(
    executionId && organizationId
      ? `${ADMIN_API_ENDPOINT}/executions/${executionId}?organizationId=${organizationId}`
      : null,
    async () =>
      makeRequest<{ execution: AdminExecutionDetail }>(
        `${ADMIN_API_ENDPOINT}/executions/${executionId}?organizationId=${organizationId}`
      )
  );

  return {
    execution: data?.execution || null,
    executionError: error || null,
    isExecutionLoading: isLoading,
    mutateExecution: mutate,
  };
};

/**
 * Hook to fetch admin emails list
 */
export const useAdminEmails = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    emails: AdminEmail[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/emails?${params}`, async () =>
    makeRequest<{ emails: AdminEmail[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/emails?${params}`
    )
  );

  return {
    emails: data?.emails || [],
    pagination: data?.pagination || null,
    emailsError: error || null,
    isEmailsLoading: isLoading,
    mutateEmails: mutate,
  };
};

/**
 * Hook to fetch admin queues list
 */
export const useAdminQueues = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    queues: AdminQueue[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/queues?${params}`, async () =>
    makeRequest<{ queues: AdminQueue[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/queues?${params}`
    )
  );

  return {
    queues: data?.queues || [],
    pagination: data?.pagination || null,
    queuesError: error || null,
    isQueuesLoading: isLoading,
    mutateQueues: mutate,
  };
};

/**
 * Hook to fetch admin datasets list
 */
export const useAdminDatasets = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    datasets: AdminDataset[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/datasets?${params}`, async () =>
    makeRequest<{ datasets: AdminDataset[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/datasets?${params}`
    )
  );

  return {
    datasets: data?.datasets || [],
    pagination: data?.pagination || null,
    datasetsError: error || null,
    isDatasetsLoading: isLoading,
    mutateDatasets: mutate,
  };
};

/**
 * Hook to fetch admin databases list
 */
export const useAdminDatabases = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    databases: AdminDatabase[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/databases?${params}`, async () =>
    makeRequest<{ databases: AdminDatabase[]; pagination: PaginationInfo }>(
      `${ADMIN_API_ENDPOINT}/databases?${params}`
    )
  );

  return {
    databases: data?.databases || [],
    pagination: data?.pagination || null,
    databasesError: error || null,
    isDatabasesLoading: isLoading,
    mutateDatabases: mutate,
  };
};

// Types for workflow structure
export interface AdminWorkflowStructure {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  runtime: string;
  nodes: any[];
  edges: any[];
}

/**
 * Hook to fetch admin workflow structure (nodes/edges)
 */
export const useAdminWorkflowStructure = (
  workflowId: string | null,
  organizationId: string | null
) => {
  const swrKey =
    workflowId && organizationId
      ? `${ADMIN_API_ENDPOINT}/workflows/${workflowId}/structure?organizationId=${organizationId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<AdminWorkflowStructure>(
    swrKey,
    swrKey ? async () => makeRequest<AdminWorkflowStructure>(swrKey) : null
  );

  return {
    workflowStructure: data || null,
    workflowStructureError: error || null,
    isWorkflowStructureLoading: isLoading,
    mutateWorkflowStructure: mutate,
  };
};

/**
 * Hook to fetch admin support inbox threads (paginated)
 */
export const useAdminSupportThreads = (
  page = 1,
  limit = 20,
  view: AdminThreadView = "inbox",
  search?: string,
  userId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    view,
    ...(search && { search }),
    ...(userId && { userId }),
  });
  const key = `${ADMIN_API_ENDPOINT}/support/threads?${params}`;
  const { data, error, isLoading, mutate } = useSWR<{
    threads: AdminThreadSummary[];
    pagination: PaginationInfo;
  }>(key, async () =>
    makeRequest<{ threads: AdminThreadSummary[]; pagination: PaginationInfo }>(
      key
    )
  );
  return {
    threads: data?.threads || [],
    pagination: data?.pagination || null,
    threadsError: error || null,
    isThreadsLoading: isLoading,
    mutateThreads: mutate,
  };
};

/**
 * Hook to fetch a single thread + its messages.
 */
export const useAdminSupportThread = (threadId: string | undefined) => {
  const key = threadId
    ? `${ADMIN_API_ENDPOINT}/support/threads/${threadId}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<AdminThreadDetail>(
    key,
    key ? async () => makeRequest<AdminThreadDetail>(key) : null
  );
  return {
    thread: data?.thread || null,
    messages: data?.messages || [],
    threadError: error || null,
    isThreadLoading: isLoading,
    mutateThread: mutate,
  };
};

/**
 * Send a reply on a thread. Server picks `In-Reply-To` from the last inbound
 * message; we just pass the body.
 */
export const sendAdminSupportReply = async (
  threadId: string,
  body: { subject?: string; text?: string; html?: string }
): Promise<{ messageId: string }> => {
  return makeRequest<{ messageId: string }>(
    `${ADMIN_API_ENDPOINT}/support/threads/${threadId}/reply`,
    { method: "POST", body: JSON.stringify(body) }
  );
};

/**
 * Create a new outbound thread from the admin inbox. The server auto-links
 * the recipient to a registered user when their email matches `users.email`.
 */
export const createAdminSupportThread = async (body: {
  toEmail: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ thread: AdminThreadSummary; messageId: string }> => {
  return makeRequest<{ thread: AdminThreadSummary; messageId: string }>(
    `${ADMIN_API_ENDPOINT}/support/threads`,
    { method: "POST", body: JSON.stringify(body) }
  );
};

/**
 * Archive or unarchive a thread. Archived threads disappear from the inbox
 * view; a new inbound message clears `archivedAt` server-side so a reply
 * brings the thread back automatically.
 */
export const updateAdminSupportThreadArchived = async (
  threadId: string,
  archived: boolean
): Promise<{ thread: AdminThreadSummary }> => {
  return makeRequest<{ thread: AdminThreadSummary }>(
    `${ADMIN_API_ENDPOINT}/support/threads/${threadId}`,
    { method: "PATCH", body: JSON.stringify({ archived }) }
  );
};

/**
 * Fetch a message body part (text or html) as a string. The endpoint streams
 * from R2; we read it as text since both parts are utf-8 encoded.
 */
export const fetchAdminSupportMessageBody = async (
  messageId: string,
  part: "text" | "html"
): Promise<string> => {
  const url = `${getApiBaseUrl()}${ADMIN_API_ENDPOINT}/support/messages/${messageId}/body?part=${part}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to fetch body (${res.status})`);
  }
  return res.text();
};

/**
 * Absolute URL for downloading an attachment. The endpoint sets a download
 * Content-Disposition; pass it as `href` on an anchor.
 */
export const adminSupportAttachmentUrl = (attachmentId: string): string =>
  `${getApiBaseUrl()}${ADMIN_API_ENDPOINT}/support/attachments/${attachmentId}`;

/**
 * Hook for the number of unread support threads for the current admin.
 * Polls every 30s so the sidebar badge updates without manual refresh.
 */
export const useAdminSupportUnreadCount = () => {
  const key = `${ADMIN_API_ENDPOINT}/support/unread-count`;
  const { data, mutate } = useSWR<{ count: number }>(
    key,
    async () => makeRequest<{ count: number }>(key),
    { refreshInterval: 30_000 }
  );
  return {
    unreadCount: data?.count ?? 0,
    mutateUnreadCount: mutate,
  };
};
