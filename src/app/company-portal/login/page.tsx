import Link from "next/link";
import CompanyAuthForm from "@/components/CompanyAuthForm";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "企業ログイン | クレームソルブ" };

export default function CompanyLoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">企業ログイン</h1>
      <CompanyAuthForm mode="login" />
      {isDemoMode() && (
        <p className="text-xs text-slate-400">
          シードのデモ企業でログイン: admin@subq.example.jp / password123
        </p>
      )}
      <p className="text-xs text-slate-400">
        企業登録は <Link href="/company-portal/register" className="text-brand-700 underline">こちら</Link>
      </p>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        レビューを投稿した個人の方は{" "}
        <Link href="/login" className="font-medium text-brand-700 underline">
          個人ログイン
        </Link>{" "}
        からお入りください(マジックリンク方式)。
      </div>
    </div>
  );
}
