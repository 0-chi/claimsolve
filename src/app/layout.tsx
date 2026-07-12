import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "クレソル(ClaimSolve)| クレーム対応の評判・スコア",
  description:
    "企業の「クレーム対応」を評価するレビューサイト。カスタマーサポートの評判・スコアを検索できます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main className="container-app py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
