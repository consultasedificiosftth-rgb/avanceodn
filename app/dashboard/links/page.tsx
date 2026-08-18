import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProviderLinksTable, type ProviderLinkRow } from "@/components/dashboard/ProviderLinksTable";

export default async function ProviderLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider: highlightProviderId } = await searchParams;
  const admin = await getCurrentAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("pds")
    .select("id, code, provider_id, providers(id, name, link_token)")
    .not("provider_id", "is", null)
    .order("code");

  if (admin && admin.profile.role !== "superadmin" && admin.profile.region_id) {
    query = query.eq("region_id", admin.profile.region_id);
  }

  const { data: pds } = await query;

  const byProvider = new Map<string, ProviderLinkRow>();
  for (const pd of pds ?? []) {
    const provider = pd.providers as unknown as { id: string; name: string; link_token: string } | null;
    if (!provider) continue;

    const row = byProvider.get(provider.id) ?? {
      id: provider.id,
      name: provider.name,
      linkToken: provider.link_token,
      pds: [],
    };
    row.pds.push({ id: pd.id, code: pd.code });
    byProvider.set(provider.id, row);
  }

  const rows = Array.from(byProvider.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Links de proveedores</h1>
        <p className="text-sm text-muted-foreground">
          Cada proveedor tiene un único link para ver y actualizar todas sus PDs asignadas.
        </p>
      </div>
      <ProviderLinksTable rows={rows} highlightProviderId={highlightProviderId ?? null} />
    </div>
  );
}
