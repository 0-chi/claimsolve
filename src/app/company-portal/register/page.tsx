import Link from "next/link";
import CompanyAuthForm from "@/components/CompanyAuthForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "企業登録 | クレームソルブ" };

export default function CompanyRegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">企業登録</h1>
      <p className="text-sm text-slate-500">
        法人番号の突合と企業ドメインのメール認証で、なりすましを防止します。
      </p>
      <CompanyAuthForm mode="register" />
      <p className="text-xs text-slate-400">
        既に登録済みの方は <Link href="/company-portal/login" className="text-brand-700 underline">ログイン</Link>
      </p>
    </div>
  );
}
