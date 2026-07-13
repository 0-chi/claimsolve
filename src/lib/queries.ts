import type { Prisma } from "@prisma/client";

// 公開対象の投稿を絞る共通条件。
// past/silent は published のみ、live は評価に載る状態(removed/frozen/pending_review を除外)。
export const PUBLIC_COMPLAINT_OR: Prisma.ComplaintWhereInput[] = [
  { lane: "past", status: "published" },
  { lane: "silent", status: "published" },
  { lane: "live", status: { notIn: ["removed", "frozen", "pending_review"] } },
];

// AR(Review)集計対象の絞り込み。silent には Review が無いため past/live のみ。
export const REVIEW_COMPLAINT_OR: Prisma.ComplaintWhereInput[] = [
  { lane: "past", status: "published" },
  { lane: "live", status: { notIn: ["removed", "frozen", "pending_review"] } },
];

export const publicReviewWhere: Prisma.ReviewWhereInput = {
  complaint: { OR: REVIEW_COMPLAINT_OR },
};

// ゲート発動の判定に使う「公開済み投稿(past+silent+live)」の条件。
export const publicComplaintWhere: Prisma.ComplaintWhereInput = {
  OR: PUBLIC_COMPLAINT_OR,
};
