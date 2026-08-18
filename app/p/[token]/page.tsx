import { ProviderPortal } from "@/components/provider-portal/ProviderPortal";

export default async function ProviderPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ProviderPortal token={token} />;
}
