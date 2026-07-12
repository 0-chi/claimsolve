import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { companyPath } from "@/lib/company-url";
import { CATEGORY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const companies = await prisma.company.findMany();

  const staticRoutes = ["", "/search", "/guide", "/terms", "/privacy", "/tokushoho", "/for-companies"].map(
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

  return [...staticRoutes, ...companyRoutes, ...guideRoutes];
}
