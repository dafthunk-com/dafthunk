import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role }: { role: string }) {
  const variant =
    role === "owner" ? "default" : role === "admin" ? "secondary" : "outline";
  return <Badge variant={variant}>{role}</Badge>;
}
