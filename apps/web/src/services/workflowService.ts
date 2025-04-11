import { Workflow } from "@dafthunk/runtime/api/types";
import { API_BASE_URL } from "../config/api";

export const workflowService = {
  // Get all workflows
  async getAll(): Promise<Workflow[]> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflows;
  },

  // Create a new workflow
  async create(name: string): Promise<Workflow> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create workflow: ${response.statusText}`);
    }

    return response.json();
  },

  // Load a workflow by ID
  async load(id: string): Promise<Workflow> {
    try {
      const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Workflow not found");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized access to workflow");
        } else {
          throw new Error(`Failed to load workflow: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error loading workflow:", error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Failed to fetch workflow");
      }
    }
  },

  // Save a workflow
  async save(id: string, workflow: Workflow): Promise<Workflow> {
    const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(workflow),
    });

    if (!response.ok) {
      throw new Error(`Failed to save workflow: ${response.statusText}`);
    }

    return response.json();
  },

  // Delete a workflow
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete workflow: ${response.statusText}`);
    }
  },
};
