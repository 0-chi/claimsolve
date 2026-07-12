import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COMPANY_COOKIE = "cs_cid";

export async function getCurrentCompanyUser() {
  const id = cookies().get(COMPANY_COOKIE)?.value;
  if (!id) return null;
  const cu = await prisma.companyUser.findUnique({
    where: { id },
    include: { company: true },
  });
  return cu;
}

// ライトプラン有効か(公開返信・改善バッジ等のゲート)。
export async function companyHasLightPlan(companyId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "trial") return sub.trialEndsAt > new Date();
  return false;
}
