import { useState } from "react";

import { useAuth } from "@/components/auth-context";
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDatabase, useDatabases } from "@/services/database-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

const CREATE_NEW = "__create_new__";

export function DatabaseField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { databases, isDatabasesLoading, mutateDatabases } = useDatabases();
  const { organization } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const stringValue = String(value ?? "");

  const handleChange = (val: string) => {
    if (val === CREATE_NEW) {
      setIsCreateDialogOpen(true);
      return;
    }
    onChange(val || undefined);
  };

  const handleCreate = async (name: string) => {
    if (!organization?.id) return;
    const response = await createDatabase({ name }, organization.id);
    await mutateDatabases();
    onChange(response.id);
    setIsCreateDialogOpen(false);
  };

  if (disabled) {
    const label = databases?.find((d) => d.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No database"}
            >
              {connected ? "Connected" : label || "No database"}
            </SelectValue>
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={handleChange}
        disabled={isDatabasesLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isDatabasesLoading
                  ? "Loading..."
                  : databases?.length === 0
                    ? "No databases"
                    : "Select database"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {databases?.map((database) => (
            <SelectItem
              key={database.id}
              value={database.id}
              className="text-xs"
            >
              {database.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW} className="text-xs">
            + New Database
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Database</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get("name") as string;
              await handleCreate(name);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Database Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter database name"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Database</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
