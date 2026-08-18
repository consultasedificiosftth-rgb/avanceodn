import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Portal de seguimiento ODN</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm next={next ?? "/dashboard"} />
        </CardContent>
      </Card>
    </div>
  );
}
