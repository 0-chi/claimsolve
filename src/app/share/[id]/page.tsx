import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { companyPath } from "@/lib/company-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const img = `${base}/api/og/share/${params.id}`;
  return {
    title: "解決しました | クレームソルブ",
    openGraph: { images: [img] },
    twitter: { card: "summary_large_image", images: [img] },
  };
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { company: true, review: true },
  });
  if (!complaint || complaint.status !== "resolved") notFound();

  const base = process.env.APP_URL || "http://localhost:3000";
  const shareUrl = `${base}/share/${params.id}`;
  const text = `${complaint.company.name}のトラブルが解決しました! #クレームソルブ`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">解決シェアカード</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/og/share/${params.id}`}
        alt="解決シェアカード"
        className="w-full rounded-xl border border-slate-200"
      />
      <div className="flex gap-2">
        <a href={xUrl} target="_blank" rel="noreferrer" className="btn-primary flex-1">
          Xでシェア
        </a>
        <a href={lineUrl} target="_blank" rel="noreferrer" className="btn-outline flex-1">
          LINEでシェア
        </a>
      </div>
      <Link href={companyPath(complaint.company)} className="text-sm text-brand-700 hover:underline">
        {complaint.company.name} のページへ
      </Link>
    </div>
  );
}
