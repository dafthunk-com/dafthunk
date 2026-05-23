"use client";
"use no memo";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyState?: {
    title: string;
    description: string;
  };
  bare?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyState = {
    title: "No results",
    description: "No data available.",
  },
  bare = false,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    const emptyTable = (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <h3 className="font-semibold text-lg">{emptyState.title}</h3>
                <p className="text-muted-foreground mt-1">
                  {emptyState.description}
                </p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    if (bare) return emptyTable;
    return <div className="border rounded-md bg-card">{emptyTable}</div>;
  }

  const tableBody = (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (bare) return tableBody;

  return <div className="rounded-md border bg-card">{tableBody}</div>;
}
