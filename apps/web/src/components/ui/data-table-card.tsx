import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableCardProps<TData> {
  title?: string;
  viewAllLink?: {
    to: string;
    text?: string;
  };
  columns: {
    header: string;
    cell: (item: TData) => ReactNode;
  }[];
  data: TData[];
  emptyState?: {
    title: string;
    description: string;
  };
}

export function DataTableCard<TData>({
  title,
  viewAllLink,
  columns,
  data,
  emptyState = {
    title: "No results",
    description: "No data available.",
  },
}: DataTableCardProps<TData>) {
  return (
    <Card>
      {(title || viewAllLink) && (
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          {title && <CardTitle className="text-xl">{title}</CardTitle>}
          {viewAllLink && (
            <Button variant="ghost" size="sm" asChild className="-mr-2 h-8">
              <Link to={viewAllLink.to} className="text-sm">
                {viewAllLink.text || "View All"}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0">
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className="px-6 h-10 text-xs text-muted-foreground"
                >
                  {column.header}
                </TableHead>
              ))}
              <TableHead className="w-[50px] px-6 h-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
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
              data.map((item, rowIndex) => (
                <TableRow key={rowIndex} className="border-t hover:bg-muted/50">
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className="px-6 py-3"
                    >
                      {column.cell(item)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right px-6 py-3">
                    <Button variant="ghost" size="icon" className="size-7">
                      <ArrowRight className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 