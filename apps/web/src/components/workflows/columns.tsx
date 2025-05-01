import { ColumnDef } from "@tanstack/react-table";
import { Workflow } from "@dafthunk/types";
import { Button } from "@/components/ui/button";
import { PencilIcon, Trash2Icon, ArrowUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<Workflow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      return <div className="font-medium">{name || "Untitled Workflow"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const workflow = row.original;

      return (
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // We'll handle this in the parent component
                  (table.options.meta as any)?.onRename?.(workflow);
                }}
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rename</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // We'll handle this in the parent component
                  (table.options.meta as any)?.onDelete?.(workflow);
                }}
                variant="ghost"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete</p>
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];
