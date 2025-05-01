import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Workflow } from "@dafthunk/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { workflowService } from "@/services/workflowService";
import { useAuth } from "@/components/authContext.tsx";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { DataTable } from "@/components/workflows/data-table";
import { columns } from "@/components/workflows/columns";

export function HomePage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  const handleLoginClick = async (provider: "github" | "google") => {
    await login(provider);
  };

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <img src="/logo.svg" alt="Dafthunk Logo" className="h-32 mb-8" />
          <h1 className="text-2xl font-bold">Workflows no one asked for</h1>
          <p className="text-gray-500 text-lg mt-2 mb-14">
            Break it, fix it, prompt it, automatic, automatic, ...
          </p>
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            <Button
              onClick={() => handleLoginClick("google")}
              className="w-full flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faGoogle} className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>
            <Button
              onClick={() => handleLoginClick("github")}
              className="w-full flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faGithub} className="w-5 h-5 mr-2" />
              Sign in with GitHub
            </Button>
          </div>
        </div>
      );
    }

    // Dashboard placeholder for authenticated users
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img src="/logo.svg" alt="Dafthunk Logo" className="h-32 mb-8" />
        <h1 className="text-3xl font-bold mb-2">Welcome to Dafthunk</h1>
        <p className="text-muted-foreground text-lg mb-4">Your dashboard will appear here soon.</p>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <main className="h-full">
        <div className="h-full overflow-hidden">
          <div className="relative h-full overflow-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
