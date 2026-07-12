import Link from "next/link";
import { getFlag } from "@/lib/flags";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ConsumerPlanActions from "@/components/ConsumerPlanActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "個人閲覧プラン | クレソル" };

export default async function ConsumerPlanPage() {
  const monetization = await getFlag("monetization_enabled");

  // 課金開始フラグOFFの間は表示・販売しない(特商法非対象を維持)
  if (!monetization) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">個人閲覧プラン</h1>
        <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-500">
          現在は無料運営期間のため、個人閲覧プランは提供していません。
          レビューを投稿すると閲覧権(1ヶ月)が得られます。
        </p>
        <Link href="/post" className="btn-primary inline-flex">レビューを投稿する</Link>
      </div>
    );
  }

  const user = await getCurrentUser();
  const plan = await prisma.plan.findUnique({ where: { key: "consumer" } });
  const sub = user
    ? await prisma.consumerSubscription.findUnique({ where: { userId: user.id } })
    : null;
  const active = sub?.status === "active" && sub.currentPeriodEnd > new Date();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">個人閲覧プラン</h1>
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{plan?.name}</span>
          <span className="text-2xl font-bold">月額{plan?.priceMonthly}円</span>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>全レビュー本文・詳細評点が閲覧し放題</li>
          <li>企業ウォッチ5社(新着レビューをメール通知)</li>
          <li>解約は2クリック以内・いつでも可能</li>
        </ul>
      </div>

      {!user ? (
        <div className="card text-center text-sm">
          <p className="text-slate-500">ご利用にはログインが必要です。</p>
          <Link href="/login" className="btn-primary mt-2 inline-flex">ログイン</Link>
        </div>
      ) : (
        <ConsumerPlanActions
          active={!!active}
          periodEnd={sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null}
          price={plan?.priceMonthly ?? 150}
        />
      )}
    </div>
  );
}
