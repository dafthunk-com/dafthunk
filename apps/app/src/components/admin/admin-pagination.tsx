import { Button } from "@/components/ui/button";

interface AdminPaginationProps {
  page: number;
  limit: number;
  itemCount: number;
  total?: number;
  totalPages?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

export function AdminPagination({
  page,
  limit,
  itemCount,
  total,
  totalPages,
  itemLabel = "items",
  onPageChange,
}: AdminPaginationProps) {
  const hasTotals = typeof total === "number" && typeof totalPages === "number";

  if (hasTotals) {
    if (totalPages <= 1) return null;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {start} to {end} of {total} {itemLabel}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  if (itemCount === 0 && page === 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {itemCount} {itemLabel} on page {page}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={itemCount < limit}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
