import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminsManager } from "@/components/dashboard/AdminsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.profile.role !== "superadmin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  const { data: profiles } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, region_id, force_password_change, regions(name)")
    .order("created_at");

  const authClient = createAdminClient();
  const emailById = new Map<string, string | null>();
  await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await authClient.auth.admin.getUserById(p.id);
      emailById.set(p.id, data.user?.email ?? null);
    })
  );

  const admins = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: emailById.get(p.id) ?? null,
    role: p.role as "admin" | "superadmin",
    regionId: p.region_id,
    regionName: (p.regions as unknown as { name: string } | null)?.name ?? null,
    forcePasswordChange: p.force_password_change,
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Administrativos</h1>
      <Card className="border-line bg-card">
        <CardHeader>
          <CardTitle className="text-base">Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminsManager
            admins={admins}
            regions={regions ?? []}
            currentAdminId={admin.userId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
