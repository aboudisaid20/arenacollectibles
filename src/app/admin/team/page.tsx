import { TeamPanel } from "@/components/admin/TeamPanel";
import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export default async function AdminTeamPage() {
  // requireAdmin runs in the layout too; repeating it here means this page
  // cannot be reached by a route that skips the layout.
  const me = await requireAdmin();
  const users = listUsers();

  return (
    <div className="container-page py-10 md:py-14">
      <TeamPanel users={users} meId={me.id} />
    </div>
  );
}
