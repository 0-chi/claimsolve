import Link from "next/link";
import { getFlag } from "@/lib/flags";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ShareUnlock from "@/components/ShareUnlock";

// 閲覧ゲート(§5.2)。全件閲覧の解放条件を提示する。
export async function GateBlock({ companyCorpNumber }: { companyCorpNumber: string }) {
  const monetization = await getFlag("monetization_enabled");
  const user = await getCurrentUser();
  const plan = monetization
    ? await prisma.plan.findUnique({ where: { key: "consumer" } })
    : null;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-700">
        全レビューの本文・詳細評点は登録すると閲覧できます
      </p>
      <p className="mt-1 text-xs text-slate-500">
        企業スコアと代表レビューは常に無料で公開しています。
      </p>
      <div className="mt-4 space-y-2">
        {/* ① レビュー投稿(本文100字以上)で1ヶ月 */}
        <Link href={`/post?company=${companyCorpNumber}`} className="btn-primary w-full">
          レビューを投稿して解放(1ヶ月・無料)
        </Link>
        <p className="text-[11px] text-slate-400">
          本文100字以上の投稿で閲覧権1ヶ月 + 企業ウォッチ1社
        </p>

        {/* ② シェアで24時間(投稿・シェアは常に解放手段) */}
        <div className="pt-1">
          <ShareUnlock appUrl={appUrl} />
        </div>

        {/* ③ 個人閲覧プラン(課金開始フラグON時のみ) */}
        {monetization && (
          <>
            <Link href="/plan/consumer" className="btn-outline w-full">
              個人閲覧プランで解放(月額{plan?.priceMonthly ?? 150}円・閲覧し放題)
            </Link>
            <p className="text-[11px] text-slate-400">投稿不要 + 企業ウォッチ5社。解約は2クリック以内。</p>
          </>
        )}
      </div>
      {!user && (
        <p className="mt-4 text-xs text-slate-400">
          すでに登録済みの方は <Link href="/login" className="text-brand-700 underline">ログイン</Link>
        </p>
      )}
    </div>
  );
}
