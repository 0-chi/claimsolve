import { getFlag } from "@/lib/flags";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "特定商取引法に基づく表記 | クレソル" };
export const dynamic = "force-dynamic";

export default async function TokushohoPage() {
  const monetization = await getFlag("monetization_enabled");
  const consumerPlan = await prisma.plan.findUnique({ where: { key: "consumer" } });

  return (
    <article className="space-y-4 text-sm text-slate-700">
      <h1 className="text-xl font-bold">特定商取引法に基づく表記</h1>
      <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
        ※プレースホルダです。公開前に弁護士の確認を受けてください。
      </p>

      <dl className="space-y-2">
        <Row k="販売事業者">(プレースホルダ)株式会社クレソル</Row>
        <Row k="運営責任者">(プレースホルダ)</Row>
        <Row k="所在地">(プレースホルダ)</Row>
        <Row k="お問い合わせ">削除・開示請求ページのフォームより</Row>
      </dl>

      {monetization ? (
        <section className="space-y-2">
          <h2 className="font-bold">個人向け販売条件(個人閲覧プラン)</h2>
          <dl className="space-y-2">
            <Row k="価格">月額 {consumerPlan?.priceMonthly ?? 150}円(税込)</Row>
            <Row k="自動更新">毎月自動更新されます。</Row>
            <Row k="解約方法">
              マイページから2クリック以内で解約できます。解約後は当該課金期間の終了まで閲覧可能です。
            </Row>
            <Row k="支払方法">クレジットカード</Row>
          </dl>
        </section>
      ) : (
        <p className="text-slate-500">
          現在は無料運営期間のため、有償の通信販売(個人向け販売)は提供していません。
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">企業向けプランの支払方法</h2>
        <p>
          月額払いはクレジットカードのみ(セルフサーブ)。銀行振込(請求書払い)は年払い限定で、
          企業からのご要望に応じて対応します(適格請求書=インボイス対応)。
        </p>
      </section>
    </article>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
      <dt className="font-medium text-slate-500">{k}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}
