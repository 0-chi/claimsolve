import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import KycForm from "@/components/KycForm";
import { kycAvailable } from "@/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "本人確認(任意)| クレームソルブ" };

export default async function KycPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">本人確認(任意)</h1>
        <p className="text-sm text-slate-500">ご利用にはログインが必要です。</p>
        <Link href="/login" className="btn-primary inline-flex">ログイン</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">本人確認(任意)</h1>
      <p className="text-sm text-slate-500">
        完了するとレビューに「本人確認済み」バッジが表示されます。任意機能です。
      </p>
      {user.kycStatus === "verified" ? (
        <div className="card bg-emerald-50 text-sm text-emerald-700">本人確認済みです。</div>
      ) : !kycAvailable ? (
        <div className="card bg-slate-50 text-sm text-slate-500">
          本人確認は現在準備中です。提供開始までお待ちください(本人確認なしでも投稿はできます)。
        </div>
      ) : (
        <KycForm />
      )}
    </div>
  );
}
