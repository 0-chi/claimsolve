import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-app flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 font-bold text-brand-700">
          <span className="text-xl">◎</span>
          <span>クレソル</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/post" className="btn-primary !px-3 !py-1.5">
            投稿する
          </Link>
          {user ? (
            <span className="text-xs text-slate-500">{user.displayName}</span>
          ) : (
            <Link href="/login" className="text-slate-600 hover:text-brand-700">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-app space-y-3 py-8 text-xs text-slate-500">
        <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
          ⚠️ 本サイトのデータはすべて架空の<strong>デモデータ</strong>です(本番投入時に削除)。
        </div>
        <p>掲載情報は投稿者の申告に基づきます。</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/guide" className="hover:text-brand-700">レビューガイドライン</Link>
          <Link href="/terms" className="hover:text-brand-700">利用規約</Link>
          <Link href="/privacy" className="hover:text-brand-700">プライバシーポリシー</Link>
          <Link href="/tokushoho" className="hover:text-brand-700">特定商取引法に基づく表記</Link>
          <Link href="/request" className="hover:text-brand-700">削除・開示請求</Link>
          <Link href="/business" className="hover:text-brand-700">企業の方へ</Link>
        </nav>
        <p className="pt-2 text-slate-400">© クレソル(ClaimSolve)— クレーム対応を評価するレビューサイト</p>
      </div>
    </footer>
  );
}
