import { Zap } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <ProgressRing
            value={100}
            size={48}
            icon={<Zap className="size-5 fill-signal text-signal" />}
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Portal ODN</h1>
            <p className="text-sm text-muted-foreground">Seguimiento de avance de tendido</p>
          </div>
        </div>
        <LoginForm next={next ?? "/dashboard"} />
      </div>
    </div>
  );
}
