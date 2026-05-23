import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

export interface AdminDetailContextBarItem {
  icon?: LucideIcon;
  label: string;
  to?: string;
  mono?: boolean;
}

export function AdminDetailContextBar({
  items,
}: {
  items: AdminDetailContextBarItem[];
}) {
  const visible = items.filter((item) => item.label);
  if (visible.length === 0) return null;

  return (
    <div className="border-b px-4 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground shrink-0">
      {visible.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden>·</span>}
          <ContextItem item={item} />
        </Fragment>
      ))}
    </div>
  );
}

function ContextItem({ item }: { item: AdminDetailContextBarItem }) {
  const Icon = item.icon;
  const inner = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className={item.mono ? "truncate font-mono text-xs" : "truncate"}>
        {item.label}
      </span>
    </>
  );
  if (item.to) {
    return (
      <Link
        to={item.to}
        className="inline-flex items-center gap-1.5 min-w-0 text-foreground hover:underline"
      >
        {inner}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">{inner}</span>
  );
}
