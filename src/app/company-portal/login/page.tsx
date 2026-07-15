import Link from "next/link";
import CompanyAuthForm from "@/components/CompanyAuthForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "企業ログイン | クレームソルブ" };

export default function CompanyLoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">企業ログイン</h1>
      <CompanyAuthForm mode="login" />
      <p className="text-xs text-slate-400">
        シードのデモ企業でログイン: admin@subq.example.jp / password123
      </p>
      <p className="text-xs text-slate-400">
        企業登録は <Link href="/company-portal/register" className="text-brand-700 underline">こちら</Link>
      </p>
    </div>
  );
}
