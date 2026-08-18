import "server-only";
import { NextResponse } from "next/server";
import { getCurrentAdmin, canAccessRegion, type CurrentAdmin } from "@/lib/auth";

export async function requireAdmin(): Promise<
  { admin: CurrentAdmin } | { response: NextResponse }
> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  return { admin };
}

export async function requireSuperadmin(): Promise<
  { admin: CurrentAdmin } | { response: NextResponse }
> {
  const result = await requireAdmin();
  if ("response" in result) return result;
  if (result.admin.profile.role !== "superadmin") {
    return {
      response: NextResponse.json({ error: "Solo el superadmin puede hacer esto." }, { status: 403 }),
    };
  }
  return result;
}

export function requireRegionAccess(
  admin: CurrentAdmin,
  regionId: string
): NextResponse | null {
  if (!canAccessRegion(admin, regionId)) {
    return NextResponse.json({ error: "No tenés acceso a esta región." }, { status: 403 });
  }
  return null;
}
