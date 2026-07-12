import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "企業の方へ | クレソル" };
export const dynamic = "force-dynamic";

export default async function ForCompaniesPage() {
  const light = await prisma.plan.findUnique({ where: { key: "light" } });

  return (
    <div className="space-y-6 text-sm text-slate-700">
      <section className="space-y-2">
        <h1 className="text-xl font-bold">企業の方へ</h1>
        <p>自社宛のレビュー・案件を確認し、公開返信や改善報告で誠実に対応できます。</p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">無料でできること</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>自社宛レビュー・案件の全文閲覧</li>
          <li>ダッシュボード基本表示</li>
          <li>週次ダイジェスト通知</li>
        </ul>
      </section>

      <section className="card space-y-2 border-brand-300">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{light?.name ?? "ライトプラン"}</h2>
          <span className="text-lg font-bold">月額{light?.priceMonthly ?? 1980}円</span>
        </div>
        <p className="text-xs text-slate-500">31日間無料トライアル(クレカ登録必須)</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>レビューへの公開返信</li>
          <li>改善済みバッジ(改善報告の掲載)</li>
          <li>スコア内訳・推移・同業ベンチマーク</li>
          <li>新着レビュー・案件の即時アラート</li>
          <li>ライブ案件の非公開スレッド返答</li>
          <li>企業ページの認証バッジ</li>
        </ul>
      </section>

      <div className="flex gap-2">
        <Link href="/company-portal/register" className="btn-primary flex-1">企業登録する</Link>
        <Link href="/company-portal/login" className="btn-outline flex-1">企業ログイン</Link>
      </div>

      <p className="text-xs text-slate-400">
        ※レビューは金銭を含むいかなる手段でも削除できません。改善は「公開返信」「改善済みバッジ」でご対応いただけます。
      </p>
    </div>
  );
}
