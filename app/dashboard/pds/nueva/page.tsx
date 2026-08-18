import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewPdForm } from "@/components/dashboard/NewPdForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NuevaPdPage() {
  const admin = await getCurrentAdmin();
  const supabase = await createClient();

  const { data: regions } = await supabase.from("regions").select("id, name").order("name");
  const { data: providers } = await supabase
    .from("providers")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Nueva PD</h1>
      <Card className="border-line bg-card">
        <CardHeader>
          <CardTitle className="text-base">Subir Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPdForm
            regions={regions ?? []}
            providers={providers ?? []}
            isSuperadmin={admin?.profile.role === "superadmin"}
            defaultRegionId={admin?.profile.region_id ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
