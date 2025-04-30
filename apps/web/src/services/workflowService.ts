import { Workflow } from "@dafthunk/types";
import { API_BASE_URL } from "../config/api";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Creates a properly configured fetch request
 */
async function apiRequest<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: object
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Resource not found: ${endpoint}`);
    } else if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized access");
    } else {
      throw new Error(`API request failed: ${response.statusText}`);
    }
  }

  return response.json();
}

export const workflowService = {
  // Get all workflows
  async getAll(): Promise<Workflow[]> {
    try {
      const data = await apiRequest<{ workflows: Workflow[] }>("/workflows");
      return data.workflows;
    } catch (error) {
      console.error("Error fetching workflows:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch workflows");
    }
  },

  // Create a new workflow
  async create(name: string): Promise<Workflow> {
    try {
      return await apiRequest<Workflow>("/workflows", "POST", { name });
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create workflow");
    }
  },

  // Load a workflow by ID
  async load(id: string): Promise<Workflow> {
    try {
      return await apiRequest<Workflow>(`/workflows/${id}`);
    } catch (error) {
      console.error("Error loading workflow:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch workflow");
    }
  },

  // Save a workflow
  async save(id: string, workflow: Workflow): Promise<Workflow> {
    try {
      return await apiRequest<Workflow>(`/workflows/${id}`, "PUT", workflow);
    } catch (error) {
      console.error("Error saving workflow:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to save workflow");
    }
  },

  // Delete a workflow
  async delete(id: string): Promise<void> {
    try {
      await apiRequest<void>(`/workflows/${id}`, "DELETE");
    } catch (error) {
      console.error("Error deleting workflow:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to delete workflow");
    }
  },
};
