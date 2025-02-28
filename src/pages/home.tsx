import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Workflow } from "@/lib/workflowTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { workflowService } from "@/services/workflowService";

export function HomePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [open, setOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setIsLoading(true);
      try {
        const fetchedWorkflows = await workflowService.getAll();
        setWorkflows(fetchedWorkflows);
      } catch (error) {
        console.error("Error fetching workflows:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newWorkflow = await workflowService.create(newWorkflowName);
      setWorkflows([...workflows, newWorkflow]);
      setNewWorkflowName("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating workflow:", error);
    }
  };

  return (
    <main className="h-screen p-2">
      <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100">
        <div className="relative h-full p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold">Workflow Editor</h1>
              <p className="text-gray-500 text-lg mt-2">
                No workflows yet. Create your first one!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <Link key={workflow.id} to={`/workflow/${workflow.id}`}>
                  <div className="p-4 rounded-lg border-2 bg-white hover:border-blue-500 transition-colors cursor-pointer">
                    <h3 className="font-medium text-lg truncate">
                      {workflow.name || "Untitled Workflow"}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="absolute bottom-4 right-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full shadow-lg h-10 w-10 p-0">
                  <PlusIcon className="w-6 h-6" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateWorkflow} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Workflow Name</Label>
                    <Input
                      id="name"
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                      placeholder="Enter workflow name"
                      className="mt-2"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Workflow
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </main>
  );
}
