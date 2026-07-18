import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 解決シェアカード画像(§5.3)。
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: params.id },
    include: { company: true, review: true },
  });

  const companyName = complaint?.company.name ?? "企業";
  const days = complaint?.review?.totalDays ?? null;
  const score = complaint?.review?.satisfaction ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#b91c1c,#dc2626)",
          color: "white",
          fontSize: 48,
          padding: 60,
        }}
      >
        <div style={{ display: "flex", fontSize: 32, opacity: 0.9 }}>クレームソルブで解決しました</div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 20, textAlign: "center" }}>
          {companyName}
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 30, fontSize: 40 }}>
          {days != null ? <div style={{ display: "flex" }}>{`${days}日で解決`}</div> : null}
          {score != null ? <div style={{ display: "flex" }}>{`${score}/10`}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.8, marginTop: 40 }}>ClaimSolve</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
