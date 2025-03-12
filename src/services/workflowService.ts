import { Workflow } from "@lib/workflowModel";
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
    const response = await fetch(`${API_BASE_URL}/workflows/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to load workflow: ${response.statusText}`);
    }

    return response.json();
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
};
