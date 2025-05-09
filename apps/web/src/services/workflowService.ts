import { apiRequest } from "@/utils/api";
import { Workflow } from "@dafthunk/types";
import { mutate } from "swr";

export const workflowService = {
  async getAll(): Promise<Workflow[]> {
    return await apiRequest<{ workflows: Workflow[] }>("/workflows", {
      method: "GET",
      errorMessage: "Failed to get all workflows",
    }).then((data) => data.workflows);
  },

  async getById(id: string): Promise<Workflow> {
    return await apiRequest<Workflow>(`/workflows/${id}`, {
      method: "GET",
      errorMessage: "Failed to load workflow",
    });
  },

  async create(name: string): Promise<Workflow> {
    const res = await apiRequest<Workflow>("/workflows", {
      method: "POST",
      body: { name },
      errorMessage: "Failed to create workflow",
    });
    mutate("/workflows");
    return res;
  },

  async save(id: string, workflow: Workflow): Promise<Workflow> {
    const res = await apiRequest<Workflow>(`/workflows/${id}`, {
      method: "PUT",
      body: workflow,
      errorMessage: "Failed to save workflow",
    });
    mutate("/workflows");
    return res;
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/workflows/${id}`, {
      method: "DELETE",
      errorMessage: "Failed to delete workflow",
    });
    mutate("/workflows");
  },

  async deploy(id: string): Promise<void> {
    await apiRequest<void>(`/deployments/${id}`, {
      method: "POST",
      errorMessage: "Failed to deploy workflow",
    });
    mutate("/deployments");
  },
};
