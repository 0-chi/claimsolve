import type { Prisma } from "@prisma/client";

// 公開対象のレビューを絞る共通条件。
// past は published のみ、live は評価に載る状態(removed/frozen/pending_review を除外)。
export const PUBLIC_COMPLAINT_OR: Prisma.ComplaintWhereInput[] = [
  { lane: "past", status: "published" },
  { lane: "live", status: { notIn: ["removed", "frozen", "pending_review"] } },
];

export const publicReviewWhere: Prisma.ReviewWhereInput = {
  complaint: { OR: PUBLIC_COMPLAINT_OR },
};
