import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getCompanyScore } from "@/lib/company-score";
import { BADGE_LABELS } from "@/lib/scoring";
import { companyHasPublicPage } from "@/lib/company-visibility";

export const runtime = "nodejs";

// 企業ページのOGP(v1.5 §7)。ゲート外情報(スコア・件数)のみを含む。
export async function GET(_req: Request, { params }: { params: { param: string } }) {
  const corporateNumber = params.param.match(/^(\d+)/)?.[1] ?? params.param;
  const company = await prisma.company.findUnique({ where: { corporateNumber } });

  // 0件企業・不存在はOGPも生成しない
  if (!company || !(await companyHasPublicPage(company.id))) {
    return new Response("not found", { status: 404 });
  }

  const score = (await getCompanyScore(company.id)).recent;
  const scoreText = score.aggregating || score.ar == null ? "集計中" : score.ar.toFixed(1);
  const badgeText = score.badge ? BADGE_LABELS[score.badge] : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          padding: 64,
          fontSize: 36,
          color: "#0f172a",
          borderBottom: "16px solid #0f9d78",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#0b7d60", fontWeight: 700 }}>クレソル</div>
        <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 16 }}>{company.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 28 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>
            {score.aggregating ? scoreText : `${scoreText}/10`}
          </div>
          {badgeText ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                background: "#eef7f4",
                color: "#0b7d60",
                padding: "8px 20px",
                borderRadius: 999,
              }}
            >
              {badgeText}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#64748b", marginTop: 20 }}>
          {`クレーム対応レビュー ${score.reviewCount}件`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
