export function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-lg bg-neutral-100" />
        <div className="aspect-video rounded-lg bg-neutral-100" />
        <div className="aspect-video rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}
