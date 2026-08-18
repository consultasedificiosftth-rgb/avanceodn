import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminsManager } from "@/components/dashboard/AdminsManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.profile.role !== "superadmin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  const { data: profiles } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role, region_id, regions(name)")
    .order("created_at");

  const admins = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    role: p.role as "admin" | "superadmin",
    regionId: p.region_id,
    regionName: (p.regions as unknown as { name: string } | null)?.name ?? null,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Administrativos</h1>
      <Card>
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
