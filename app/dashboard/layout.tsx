import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { logout } from "@/app/dashboard/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  if (admin.profile.force_password_change) redirect("/change-password");

  let regionName = "Todas las regiones";
  if (admin.profile.region_id) {
    const supabase = await createClient();
    const { data: region } = await supabase
      .from("regions")
      .select("name")
      .eq("id", admin.profile.region_id)
      .single();
    regionName = region?.name ?? regionName;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
              <ProgressRing value={100} size={28} icon={<Zap className="size-3.5 fill-signal text-signal" />} />
              <span>Portal ODN</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                PDs
              </Link>
              <Link href="/dashboard/pds/nueva" className="transition-colors hover:text-foreground">
                Nueva PD
              </Link>
              {admin.profile.role === "superadmin" && (
                <Link href="/dashboard/admins" className="transition-colors hover:text-foreground">
                  Administrativos
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm">
              <span className="font-medium text-foreground">{regionName}</span>
              <span className="text-muted-foreground">
                · {admin.profile.role === "superadmin" ? "Superadmin" : "Admin"}
              </span>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
