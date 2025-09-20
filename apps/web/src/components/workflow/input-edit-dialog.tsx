import { XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSecrets } from "@/services/secrets-service";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "@/components/workflow/workflow-context";
import { WorkflowParameter } from "@/components/workflow/workflow-types";

interface InputEditDialogProps {
  nodeId: string;
  nodeInputs: WorkflowParameter[];
  input: WorkflowParameter | null;
  isOpen: boolean;
  onClose: () => void;
  readonly?: boolean;
}

export function InputEditDialog({
  nodeId,
  nodeInputs,
  input,
  isOpen,
  onClose,
  readonly,
}: InputEditDialogProps) {
  const { updateNodeData } = useWorkflow();
  const [inputValue, setInputValue] = useState("");
  const { secrets, isSecretsLoading } = useSecrets();

  useEffect(() => {
    if (input) {
      setInputValue(input.value !== undefined ? String(input.value) : "");
    } else {
      setInputValue("");
    }
  }, [input]);

  const handleInputChange = (value: string) => {
    if (!input || readonly || !updateNodeData) return;

    setInputValue(value);
    const typedValue = convertValueByType(value, input.type);
    updateNodeInput(nodeId, input.id, typedValue, nodeInputs, updateNodeData);
  };

  const handleClearValue = () => {
    if (!input || readonly || !updateNodeData) return;

    clearNodeInput(nodeId, input.id, nodeInputs, updateNodeData);
    setInputValue("");
  };

  const handleSecretSelect = (secretName: string) => {
    if (!input || readonly || !updateNodeData) return;

    setInputValue(secretName);
    updateNodeInput(nodeId, input.id, secretName, nodeInputs, updateNodeData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onClose();
    }
  };

  if (!input) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Parameter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="input-value" className="text-sm font-medium">
                {input.name}
              </Label>
              <span className="text-xs text-neutral-500">{input.type}</span>
            </div>

            <div className="relative">
              {input.type === "boolean" ? (
                <div className="flex gap-2">
                  <Button
                    variant={inputValue === "true" ? "default" : "outline"}
                    onClick={() => handleInputChange("true")}
                    className="flex-1"
                    disabled={readonly}
                  >
                    True
                  </Button>
                  <Button
                    variant={inputValue === "false" ? "default" : "outline"}
                    onClick={() => handleInputChange("false")}
                    className="flex-1"
                    disabled={readonly}
                  >
                    False
                  </Button>
                </div>
              ) : input.type === "number" ? (
                <div className="relative">
                  <Input
                    id="input-value"
                    type="number"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter number value"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "string" ? (
                <div className="relative">
                  <Textarea
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        onClose();
                      }
                    }}
                    placeholder="Enter text value"
                    className="min-h-[100px] resize-y"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "json" ? (
                <div className="relative">
                  <Textarea
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        onClose();
                      }
                    }}
                    placeholder="Enter json value"
                    className="min-h-[100px] resize-y"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : input.type === "secret" ? (
                <div className="relative">
                  <Select
                    value={inputValue}
                    onValueChange={handleSecretSelect}
                    disabled={readonly || isSecretsLoading}
                  >
                    <SelectTrigger id="input-value">
                      <SelectValue 
                        placeholder={
                          isSecretsLoading 
                            ? "Loading secrets..." 
                            : secrets.length === 0 
                            ? "No secrets available"
                            : "Select a secret"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {secrets.map((secret) => (
                        <SelectItem key={secret.id} value={secret.name}>
                          {secret.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="input-value"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter text value"
                    disabled={readonly}
                  />
                  {inputValue && !readonly && (
                    <button
                      onClick={handleClearValue}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      aria-label="Clear value"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
