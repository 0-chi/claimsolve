// 本番用の最小シード(冪等)。架空データは一切入れない(v1.5 §10)。
// 投入するのはアプリの動作に必須な「フラグ」と「プラン定義」のみ。
// 既存行は上書きしない(update: {})ため、admin がフラグを変更していても保持される。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const flags: { key: string; value: boolean }[] = [
    { key: "gate_enabled", value: false },
    { key: "monetization_enabled", value: false },
    // v1.5 §1変更3: live は初期値ON(緊急停止用にOFF切替可)
    { key: "live_enabled", value: true },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {},
      create: { key: f.key, value: f.value, updatedBy: "seed" },
    });
  }

  const plans = [
    { key: "light", name: "ライトプラン", priceMonthly: 1980, active: true },
    { key: "consumer", name: "個人閲覧プラン", priceMonthly: 150, active: true },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  console.log("本番シード完了(フラグ+プランのみ・架空データなし)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
