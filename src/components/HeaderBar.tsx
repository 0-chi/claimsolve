"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// ハンバーガーメニューの項目(上から順)。リンク切れが無いよう全ページ実在。
const MENU_ITEMS: { href: string; label: string }[] = [
  { href: "/about", label: "クレームソルブについて" },
  { href: "/business", label: "企業の皆様へ" },
  { href: "/login", label: "ログイン" },
  { href: "/menu", label: "サービスメニュー" },
  { href: "/support", label: "サポート" },
  { href: "/terms", label: "利用規約" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/privacy", label: "プライバシーポリシー" },
];

const BrandMark = () => (
  <span className="flex items-center gap-1.5 font-bold text-brand-700">
    <span className="text-xl">◎</span>
    <span>クレームソルブ</span>
  </span>
);

export function HeaderBar({ userName }: { userName: string | null }) {
  const [open, setOpen] = useState(false);

  // メニューを開いている間は背面スクロールを止め、Escで閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-app flex h-14 items-center justify-between">
          {/* ロゴをタップするとメニューが開く */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="メニューを開く"
            aria-expanded={open}
            className="flex items-center"
          >
            <BrandMark />
          </button>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/post" className="btn-primary !px-3 !py-1.5">
              投稿する
            </Link>
            {userName ? (
              <span className="text-xs text-slate-500">{userName}</span>
            ) : (
              <Link href="/login" className="text-slate-600 hover:text-brand-700">
                ログイン
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* オーバーレイ(外側タップで閉じる) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* 左からスライドインするメニュー */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <BrandMark />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="メニューを閉じる"
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col overflow-y-auto py-1">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
