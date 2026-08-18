import { ProviderPortal } from "@/components/provider-portal/ProviderPortal";

export default async function ProviderPortalPage({
  params,
}: {
  params: Promise<{ providerToken: string; pdId: string }>;
}) {
  const { providerToken, pdId } = await params;
  return <ProviderPortal providerToken={providerToken} pdId={pdId} />;
}
