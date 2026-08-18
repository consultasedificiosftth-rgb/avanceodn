import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <ProgressRing
            value={100}
            size={48}
            icon={<KeyRound className="size-5 text-signal" />}
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Cambiá tu contraseña</h1>
            <p className="text-sm text-muted-foreground">
              {admin.profile.force_password_change
                ? "Es tu primer ingreso (o te la blanquearon). Elegí una nueva para continuar."
                : "Elegí tu nueva contraseña."}
            </p>
          </div>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
