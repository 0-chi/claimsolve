import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">ログイン</h1>
      <p className="text-sm text-slate-500">
        登録済みのメールアドレスにログインリンクをお送りします(マジックリンク方式)。
      </p>
      <LoginForm />
      <p className="text-xs text-slate-400">
        アカウントをお持ちでない方は、レビューを投稿すると自動で登録されます。
      </p>
    </div>
  );
}
