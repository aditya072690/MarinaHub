import { getTeamMembers } from "@/actions/team";
import { getSessionContext } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

export default async function TeamPage() {
  const session = await getSessionContext();
  if (!session?.activeMarina) redirect("/onboarding");
  if (session.activeRole !== "owner") redirect("/dashboard");

  const members = await getTeamMembers(session.activeMarina.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-muted-foreground">
        Manage marina staff access. Invite flow via email is planned for post-MVP.
      </p>
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite staff and managers to help run your marina."
        />
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.full_name ?? "—"}
                </TableCell>
                <TableCell>{m.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {m.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
