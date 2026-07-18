import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { HeaderBar } from "@/components/HeaderBar";
import { isDemoMode } from "@/lib/env";
import { SHOW_BUSINESS_ENTRY } from "@/lib/ui-flags";

export async function Header() {
  const user = await getCurrentUser();
  return <HeaderBar userName={user?.displayName ?? null} />;
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-app space-y-3 py-8 text-xs text-slate-500">
        {/* デモモード(本番DB未接続)のときだけ表示。本番では自動的に消える */}
        {isDemoMode() && (
          <div className="rounded-lg bg-amber-50 p-3 text-amber-800">
            ⚠️ 本サイトのデータはすべて架空の<strong>デモデータ</strong>です(本番投入時に削除)。
          </div>
        )}
        <p>掲載情報は投稿者の申告に基づきます。</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/guide" className="hover:text-brand-700">レビューガイドライン</Link>
          <Link href="/terms" className="hover:text-brand-700">利用規約</Link>
          <Link href="/privacy" className="hover:text-brand-700">プライバシーポリシー</Link>
          <Link href="/tokushoho" className="hover:text-brand-700">特定商取引法に基づく表記</Link>
          <Link href="/request" className="hover:text-brand-700">削除・開示請求</Link>
          {SHOW_BUSINESS_ENTRY && (
            <Link href="/business" className="hover:text-brand-700">企業の方へ</Link>
          )}
        </nav>
        <p className="pt-2 text-slate-400">© クレームソルブ(ClaimSolve)— クレーム対応を評価するレビューサイト</p>
      </div>
    </footer>
  );
}
