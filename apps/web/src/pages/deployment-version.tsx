import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { toast } from "sonner";
import { WorkflowDeploymentVersion, Workflow, Parameter, ParameterType } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Node, Edge } from "@xyflow/react";
import { WorkflowNodeType, WorkflowEdgeType, NodeTemplate } from "@/components/workflow/workflow-types";
import { fetchNodeTypes } from "@/services/workflowNodeService";

export function DeploymentVersionPage() {
  const { deploymentId = "" } = useParams();
  const [deployment, setDeployment] =
    useState<WorkflowDeploymentVersion | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<Node<WorkflowNodeType>[]>([]);
  const [edges, setEdges] = useState<Edge<WorkflowEdgeType>[]>([]);
  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  // Fetch node templates/types
  useEffect(() => {
    const loadNodeTemplates = async () => {
      try {
        const types = await fetchNodeTypes();
        const templates: NodeTemplate[] = types.map((type) => ({
          id: type.id,
          type: type.id,
          name: type.name,
          description: type.description || "",
          category: type.category,
          inputs: type.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            hidden: input.hidden,
          })),
          outputs: type.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
        }));
        setNodeTemplates(templates);
        setTemplatesError(null);
      } catch (error) {
        console.error("Failed to load node templates:", error);
        setTemplatesError(
          "Failed to load node templates. Some nodes may not display correctly."
        );
      }
    };

    loadNodeTemplates();
  }, []);

  // Fetch the workflow data
  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }

      const workflowData = await response.json();
      setWorkflow(workflowData);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      toast.error("Failed to fetch workflow details.");
    }
  };

  // Update breadcrumbs when both workflow and deployment are available
  useEffect(() => {
    if (workflow && deployment) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        {
          label: workflow.name,
          to: `/workflows/deployments/${workflow.id}`,
        },
        { label: `v${deployment.version}` },
      ]);
    }
  }, [workflow, deployment, setBreadcrumbs]);

  // Fetch the specific deployment version
  const fetchDeployment = async () => {
    if (!deploymentId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/deployments/version/${deploymentId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch deployment: ${response.statusText}`);
      }

      const data = await response.json();
      setDeployment(data);

      // Transform nodes and edges to ReactFlow format
      transformDeploymentToReactFlow(data);

      // Fetch workflow data once we have the workflowId
      if (data.workflowId) {
        await fetchWorkflow(data.workflowId);
      }
    } catch (error) {
      console.error("Error fetching deployment:", error);
      toast.error("Failed to fetch deployment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Transform deployment nodes and edges to ReactFlow format
  const transformDeploymentToReactFlow = useCallback((deployment: WorkflowDeploymentVersion) => {
    try {
      // Transform nodes
      const reactFlowNodes: Node<WorkflowNodeType>[] = deployment.nodes.map((node) => ({
        id: node.id,
        type: "workflowNode",
        position: node.position,
        data: {
          name: node.name,
          inputs: node.inputs.map((input) => ({
            id: input.name,
            type: input.type,
            name: input.name,
            value: input.value,
            hidden: input.hidden,
            required: input.required,
          })),
          outputs: node.outputs.map((output) => ({
            id: output.name,
            type: output.type,
            name: output.name,
            hidden: output.hidden,
          })),
          executionState: "idle" as const,
          nodeType: node.type,
        },
      }));

      // Transform edges
      const reactFlowEdges: Edge<WorkflowEdgeType>[] = deployment.edges.map((edge, index) => ({
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceOutput,
        targetHandle: edge.targetInput,
        type: "workflowEdge",
        data: {
          isValid: true,
          sourceType: edge.sourceOutput,
          targetType: edge.targetInput,
        },
      }));

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error("Error transforming deployment to ReactFlow format:", error);
      toast.error("Failed to process workflow structure.");
    }
  }, []);

  // Load the deployment on component mount
  useEffect(() => {
    fetchDeployment();
  }, [deploymentId]);

  // Create a simple validate connection function (read-only mode)
  const validateConnection = useCallback(() => false, []);

  return (
    <InsetLayout
      title={
        deployment?.version ? `Version ${deployment.version}` : "Deployment"
      }
    >
      {isLoading ? (
        <div className="py-10 text-center">Loading deployment details...</div>
      ) : deployment ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Details for this workflow deployment version
              </p>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6 mt-4">
              {workflow && (
                <WorkflowInfoCard
                  id={workflow.id}
                  name={workflow.name}
                  description="Details about this workflow"
                />
              )}

              <DeploymentInfoCard
                id={deployment.id}
                version={deployment.version}
                createdAt={deployment.createdAt}
              />
            </TabsContent>
            
            <TabsContent value="workflow" className="mt-4">
              <div className="h-[calc(100vh-280px)] border rounded-md">
                {nodes.length > 0 && (
                  <WorkflowBuilder
                    workflowId={deployment.id}
                    initialNodes={nodes}
                    initialEdges={edges}
                    nodeTemplates={nodeTemplates}
                    validateConnection={validateConnection}
                    readonly={true}
                  />
                )}
                {nodes.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-muted-foreground">No workflow structure available</p>
                  </div>
                )}
                {templatesError && (
                  <div className="absolute top-4 right-4 bg-amber-100 px-3 py-1 rounded-md text-amber-800 text-sm">
                    {templatesError}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Deployment not found</p>
        </div>
      )}
    </InsetLayout>
  );
}
