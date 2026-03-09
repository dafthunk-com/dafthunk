export function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 items-center">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`text-sm break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
