import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth";
import { signPhotoUrls } from "@/lib/storage";
import { pctOdn, type Nap, type NapPhoto, type PdDailySnapshot } from "@/lib/types";
import { PdTimeline } from "@/components/dashboard/PdTimeline";
import { NapList, type NapListItem } from "@/components/dashboard/NapList";
import { PendingReviewBanner } from "@/components/dashboard/PendingReviewBanner";
import { ReuploadForm } from "@/components/dashboard/ReuploadForm";
import { ExportButtons } from "@/components/dashboard/ExportButtons";

export default async function PdDetailPage({
  params,
}: {
  params: Promise<{ pdId: string }>;
}) {
  const { pdId } = await params;
  const admin = await getCurrentAdmin();
  const supabase = await createClient();

  const { data: pd } = await supabase
    .from("pds")
    .select("*, providers(name), regions(name)")
    .eq("id", pdId)
    .maybeSingle();

  if (!pd) notFound();

  const { data: naps } = await supabase
    .from("naps")
    .select("*, nap_photos(*)")
    .eq("pd_id", pdId)
    .eq("active", true)
    .order("code");

  const { data: snapshots } = await supabase
    .from("pd_daily_snapshots")
    .select("*")
    .eq("pd_id", pdId)
    .order("snapshot_date", { ascending: false });

  const { data: pendingUpload } = await supabase
    .from("pd_uploads")
    .select("*")
    .eq("pd_id", pdId)
    .eq("status", "pending_review")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const napsTyped = (naps ?? []) as (Nap & { nap_photos: NapPhoto[] })[];

  const adminClient = createAdminClient();
  const allPaths = napsTyped.flatMap((n) => n.nap_photos.map((p) => p.storage_path));
  const signedUrls = await signPhotoUrls(adminClient, allPaths);

  const napListItems: NapListItem[] = napsTyped.map((n) => ({
    id: n.id,
    code: n.code,
    construido: n.construido,
    pruebas_opticas: n.pruebas_opticas,
    photos: {
      construido: n.nap_photos
        .filter((p) => p.category === "construido")
        .map((p) => ({ id: p.id, url: signedUrls[p.storage_path] ?? null })),
      pr_optica: n.nap_photos
        .filter((p) => p.category === "pr_optica")
        .map((p) => ({ id: p.id, url: signedUrls[p.storage_path] ?? null })),
    },
  }));

  const total = napsTyped.length;
  const construidos = napsTyped.filter((n) => n.construido).length;
  const pruebasOpticas = napsTyped.filter((n) => n.pruebas_opticas).length;

  const providerName = (pd.providers as unknown as { name: string } | null)?.name ?? "—";
  const regionName = (pd.regions as unknown as { name: string } | null)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">PD {pd.code}</h1>
          <p className="text-sm text-muted-foreground">
            {regionName} · Proveedor: {providerName}
          </p>
        </div>
        <ExportButtons scope="pd" pdId={pd.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="% ODN" value={`${pctOdn(construidos, total)}%`} />
        <StatCard label="Total NAPs" value={String(total)} />
        <StatCard label="Construidos" value={`${construidos}/${total}`} />
        <StatCard label="Pruebas ópticas" value={`${pruebasOpticas}/${total}`} />
      </div>

      {pendingUpload && (
        <PendingReviewBanner
          pdId={pd.id}
          uploadId={pendingUpload.id}
          missingCodes={pendingUpload.missing_codes ?? []}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-4">
        <div>
          <p className="text-sm font-medium">Re-cargar Excel</p>
          <p className="text-xs text-muted-foreground">Actualiza los NAPs de esta PD desde un nuevo archivo.</p>
        </div>
        <ReuploadForm pdId={pd.id} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Línea de tiempo</h2>
        <PdTimeline snapshots={(snapshots ?? []) as PdDailySnapshot[]} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">NAPs ({total})</h2>
        <NapList naps={napListItems} canRemove={admin?.profile.role === "superadmin"} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
