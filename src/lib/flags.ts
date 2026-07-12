// フラグ管理(gate_enabled / monetization_enabled / live_enabled)。
import { prisma } from "@/lib/prisma";
import { shouldGateBeOn } from "@/lib/gate";
import { publicReviewWhere } from "@/lib/queries";

export type FlagKey = "gate_enabled" | "monetization_enabled" | "live_enabled";

export async function getFlag(key: FlagKey): Promise<boolean> {
  const f = await prisma.featureFlag.findUnique({ where: { key } });
  return f?.value ?? false;
}

export async function getAllFlags(): Promise<Record<FlagKey, boolean>> {
  const rows = await prisma.featureFlag.findMany();
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    gate_enabled: map.gate_enabled ?? false,
    monetization_enabled: map.monetization_enabled ?? false,
    live_enabled: map.live_enabled ?? false,
  };
}

export async function setFlag(key: FlagKey, value: boolean, by: string): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    update: {
      value,
      updatedBy: by,
      activatedAt: value ? new Date() : null,
    },
    create: {
      key,
      value,
      updatedBy: by,
      activatedAt: value ? new Date() : null,
    },
  });
}

export async function getGateActivatedAt(): Promise<Date | null> {
  const f = await prisma.featureFlag.findUnique({ where: { key: "gate_enabled" } });
  return f?.value ? f.activatedAt ?? null : null;
}

// 公開レビュー総数(past published + live 評価確定分)。
export async function publicReviewCount(): Promise<number> {
  return prisma.review.count({ where: publicReviewWhere });
}

// 200件超で自動ON(admin が手動上書きした場合は尊重して自動変更しない)。
export async function maybeAutoActivateGate(): Promise<boolean> {
  const f = await prisma.featureFlag.findUnique({ where: { key: "gate_enabled" } });
  const manuallyOverridden = f?.updatedBy === "admin";
  if (manuallyOverridden) return f?.value ?? false;

  const count = await publicReviewCount();
  const target = shouldGateBeOn(count);
  if (target && !(f?.value ?? false)) {
    await prisma.featureFlag.update({
      where: { key: "gate_enabled" },
      data: { value: true, updatedBy: "auto", activatedAt: new Date() },
    });
    return true;
  }
  return f?.value ?? false;
}
