import type { MetadataRoute } from "next";
import { companyPath } from "@/lib/company-url";
import { companiesWithPublicPosts } from "@/lib/company-visibility";
import { CATEGORY_LABELS } from "@/lib/labels";
import { ARTICLES } from "@/content/articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  // 公開投稿0件の企業はインデックスさせない(v1.5 §1変更6・staffは数えない)
  const companies = await companiesWithPublicPosts();

  const staticRoutes = ["", "/search", "/guide", "/terms", "/privacy", "/tokushoho", "/business"].map(
    (p) => ({ url: `${base}${p}`, lastModified: new Date() })
  );

  const companyRoutes = companies.map((c) => ({
    url: `${base}${companyPath(c)}`,
    lastModified: c.createdAt,
  }));

  const guideRoutes = Object.keys(CATEGORY_LABELS).map((cat) => ({
    url: `${base}/guide/${cat}`,
    lastModified: new Date(),
  }));

  const articleRoutes = ARTICLES.map((a) => ({
    url: `${base}/guide/articles/${a.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...companyRoutes, ...guideRoutes, ...articleRoutes];
}
