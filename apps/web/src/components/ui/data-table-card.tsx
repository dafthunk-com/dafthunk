import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface DataTableCardProps<TData, TValue> {
  title?: ReactNode;
  viewAllLink?: {
    to: string;
    text?: string;
  };
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyState?: {
    title: string;
    description: string;
  };
}

export function DataTableCard<TData, TValue>({
  title,
  viewAllLink,
  columns,
  data,
  emptyState = {
    title: "No results",
    description: "No data available.",
  },
}: DataTableCardProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      {(title || viewAllLink) && (
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          {title && <CardTitle className="text-xl">{title}</CardTitle>}
          {viewAllLink && (
            <Button variant="ghost" size="sm" asChild className="-mr-2 h-8">
              <Link to={viewAllLink.to} className="text-sm">
                {viewAllLink.text || "View All"}
              </Link>
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-6 h-10 text-xs text-muted-foreground"
                  >
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
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <h3 className="font-semibold text-lg">{emptyState.title}</h3>
                    <p className="text-muted-foreground mt-1">
                      {emptyState.description}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-t hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-6 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 