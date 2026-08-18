import { ProviderPdList } from "@/components/provider-portal/ProviderPdList";

export default async function ProviderPdListPage({
  params,
}: {
  params: Promise<{ providerToken: string }>;
}) {
  const { providerToken } = await params;
  return <ProviderPdList providerToken={providerToken} />;
}
