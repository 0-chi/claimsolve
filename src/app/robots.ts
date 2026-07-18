import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 投稿者専用ページ・管理画面・企業ポータルはインデックス対象外
      disallow: ["/m/", "/admin", "/company-portal", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
