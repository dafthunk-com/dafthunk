import useSWR from "swr";

import { makeRequest } from "./utils";

// Admin API base endpoint
const ADMIN_API_ENDPOINT = "/admin";

// Response types
export interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalWorkflows: number;
  totalDeployments: number;
  recentSignups: number;
  activeUsers24h: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  plan: string;
  role: string;
  developerMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserDetail extends AdminUser {
  githubId: string | null;
  googleId: string | null;
  tourCompleted: boolean;
}

export interface AdminUserMembership {
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  role: string;
  joinedAt: Date;
}

export interface AdminOrganization {
  id: string;
  name: string;
  handle: string;
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
  handle: string;
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
  deploymentCount: number;
  emailCount: number;
  queueCount: number;
  datasetCount: number;
  databaseCount: number;
}

export interface AdminWorkflow {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  trigger: string;
  runtime: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  activeDeploymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  deploymentId?: string;
  organizationId: string;
  organizationName: string;
  status: string;
  error?: string;
  startedAt: Date;
  endedAt: Date;
  usage: number;
}

export interface AdminDeployment {
  id: string;
  version: number;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  workflowId: string | null;
  workflowName: string | null;
  workflowHandle: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminEmail {
  id: string;
  name: string;
  handle: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminQueue {
  id: string;
  name: string;
  handle: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDataset {
  id: string;
  name: string;
  handle: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDatabase {
  id: string;
  name: string;
  handle: string;
  organizationId: string;
  organizationName: string;
  organizationHandle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Hooks

/**
 * Hook to fetch admin dashboard statistics
 */
export const useAdminStats = () => {
  const { data, error, isLoading, mutate } = useSWR<AdminStats>(
    `${ADMIN_API_ENDPOINT}/stats`,
    async () => makeRequest<AdminStats>(`${ADMIN_API_ENDPOINT}/stats`)
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
 * Hook to fetch admin deployments list
 */
export const useAdminDeployments = (
  page = 1,
  limit = 20,
  search?: string,
  organizationId?: string,
  workflowId?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(organizationId && { organizationId }),
    ...(workflowId && { workflowId }),
  });

  const { data, error, isLoading, mutate } = useSWR<{
    deployments: AdminDeployment[];
    pagination: PaginationInfo;
  }>(`${ADMIN_API_ENDPOINT}/deployments?${params}`, async () =>
    makeRequest<{
      deployments: AdminDeployment[];
      pagination: PaginationInfo;
    }>(`${ADMIN_API_ENDPOINT}/deployments?${params}`)
  );

  return {
    deployments: data?.deployments || [],
    pagination: data?.pagination || null,
    deploymentsError: error || null,
    isDeploymentsLoading: isLoading,
    mutateDeployments: mutate,
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
