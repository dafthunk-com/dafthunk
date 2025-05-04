import { useState } from "react";
import { WorkflowDeploymentVersion } from "@dafthunk/types";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";

interface DeploymentHistoryTableProps {
  deployments: WorkflowDeploymentVersion[];
  currentDeploymentId: string;
  workflowId: string;
  isLoading?: boolean;
}

export function DeploymentHistoryTable({
  deployments,
  currentDeploymentId,
  workflowId,
  isLoading = false,
}: DeploymentHistoryTableProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Show only most recent 3 deployments unless expanded
  const displayDeployments = expanded
    ? deployments
    : deployments.slice(0, 3);

  // Format a date string
  const formatDate = (dateString: string | Date) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      return String(dateString);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deployment ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Nodes</TableHead>
              <TableHead>Edges</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Loading deployment history...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deployment ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Nodes</TableHead>
              <TableHead>Edges</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No deployment history found.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deployment ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Nodes</TableHead>
              <TableHead>Edges</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDeployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-mono text-xs">
                  {deployment.id === currentDeploymentId ? (
                    <div className="flex items-center">
                      {deployment.id}
                      <Badge variant="outline" className="ml-2 bg-green-50">Current</Badge>
                    </div>
                  ) : (
                    <>{deployment.id}</>
                  )}
                </TableCell>
                <TableCell className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                  {formatDate(deployment.createdAt)}
                </TableCell>
                <TableCell>
                  {deployment.nodes.length}
                </TableCell>
                <TableCell>
                  {deployment.edges.length}
                </TableCell>
                <TableCell>
                  <Link to={`/workflows/deployments/version/${deployment.id}`}>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {deployments.length > 3 && (
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? (
              "Show Less"
            ) : (
              <>
                Show All ({deployments.length}) Deployments
                <ArrowDown className="ml-1 h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 