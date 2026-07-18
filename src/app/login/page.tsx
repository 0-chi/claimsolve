import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { SHOW_BUSINESS_ENTRY } from "@/lib/ui-flags";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">個人の方のログイン</h1>
      <p className="text-sm text-slate-500">
        登録済みのメールアドレスにログインリンクをお送りします(マジックリンク方式)。
      </p>
      <LoginForm />
      <p className="text-xs text-slate-400">
        アカウントをお持ちでない方は、レビューを投稿すると自動で登録されます。
      </p>
      {SHOW_BUSINESS_ENTRY && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          企業の担当者の方は{" "}
          <Link href="/company-portal/login" className="font-medium text-brand-700 underline">
            企業ログイン
          </Link>{" "}
          からお入りください(メール+パスワード方式)。
        </div>
      )}
    </div>
  );
}
