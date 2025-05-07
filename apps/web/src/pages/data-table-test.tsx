import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

// Example data type
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  isActive: boolean;
};

// Hard-coded synthetic data
const users: User[] = Array.from({ length: 50 }, (_, i) => {
  const id = (i + 1).toString();
  const names = [
    "Alice Smith",
    "Bob Jones",
    "Charlie Brown",
    "Dana White",
    "Eve Black",
    "Frank Green",
    "Grace Lee",
    "Hank Miller",
    "Ivy Wilson",
    "Jack Taylor",
    "Kara Adams",
    "Liam Clark",
    "Mona Davis",
    "Nina Evans",
    "Oscar Foster",
    "Paula Garcia",
    "Quinn Harris",
    "Rita Irving",
    "Sam Johnson",
    "Tina King",
    "Uma Lewis",
    "Vera Moore",
    "Will Nash",
    "Xena Owens",
    "Yuri Price",
    "Zane Quinn",
    "Amy Reed",
    "Ben Stone",
    "Cleo Turner",
    "Drew Underwood",
    "Elle Vincent",
    "Finn Walker",
    "Gina Xu",
    "Hugo Young",
    "Iris Zane",
    "Jake Allen",
    "Kiki Brown",
    "Leo Carter",
    "Maya Diaz",
    "Nico Ellis",
    "Ollie Fox",
    "Pia Grant",
    "Quincy Hall",
    "Rae Ingram",
    "Seth James",
    "Tara Kim",
    "Ugo Lane",
    "Vik Moss",
    "Wren Neal",
    "Yasmin Otto",
  ];
  const name = names[i % names.length];
  const email = name.toLowerCase().replace(/ /g, "") + `@example.com`;
  const roles: User["role"][] = ["admin", "user", "viewer"];
  const role = roles[i % roles.length];
  const isActive = i % 2 === 0;
  return { id, name, email, role, isActive };
});

// Column definitions
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: () => <span>Name</span>,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: () => <span>Email</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "role",
    header: () => <span>Role</span>,
    cell: ({ row }) => (
      <span
        className={
          row.original.role === "admin"
            ? "text-red-600 font-semibold"
            : row.original.role === "user"
              ? "text-blue-600"
              : "text-gray-600"
        }
      >
        {row.original.role}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: () => <span>Status</span>,
    cell: ({ row }) => (
      <span
        className={row.original.isActive ? "text-green-600" : "text-gray-400"}
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {}}>View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

export default function DataTableTestPage() {
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">DataTable Demo</h1>
      <DataTable columns={columns} data={users} />
    </div>
  );
}
