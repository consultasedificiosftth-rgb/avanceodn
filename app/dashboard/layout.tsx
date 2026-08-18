import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/dashboard/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

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
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              Portal ODN
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">
                PDs
              </Link>
              <Link href="/dashboard/pds/nueva" className="hover:text-foreground">
                Nueva PD
              </Link>
              {admin.profile.role === "superadmin" && (
                <Link href="/dashboard/admins" className="hover:text-foreground">
                  Administrativos
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {regionName} · {admin.profile.role === "superadmin" ? "Superadmin" : "Admin"}
            </span>
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
