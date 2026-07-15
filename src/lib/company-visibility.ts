// 投稿0件の企業ページは生成もインデックスもしない(v1.5 §1変更6)。
// 「公開投稿」= past/silent/live のみ。staff は完全非公開のため数えない
// (数えると、非公開の申し出の存在がページ生成の有無から漏れるため)。
import { prisma } from "@/lib/prisma";
import { publicComplaintWhere } from "@/lib/queries";

export async function companyPublicPostCount(companyId: string): Promise<number> {
  return prisma.complaint.count({ where: { companyId, ...publicComplaintWhere } });
}

export async function companyHasPublicPage(companyId: string): Promise<boolean> {
  return (await companyPublicPostCount(companyId)) > 0;
}

// sitemap 用: 公開投稿が1件以上ある企業のみ。
export async function companiesWithPublicPosts() {
  const companies = await prisma.company.findMany();
  const result = [];
  for (const c of companies) {
    if (await companyHasPublicPage(c.id)) result.push(c);
  }
  return result;
}
