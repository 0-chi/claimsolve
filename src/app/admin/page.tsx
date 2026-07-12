import { prisma } from "@/lib/prisma";
import { getAllFlags, publicReviewCount } from "@/lib/flags";
import { AdminActionButton, FlagToggle } from "@/components/AdminButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "運営管理 | クレソル" };

export default async function AdminPage() {
  const flags = await getAllFlags();
  const reviewCount = await publicReviewCount();

  const pendingLive = await prisma.complaint.findMany({
    where: { lane: "live", status: "pending_review" },
    include: { company: true },
  });
  const queuedEmails = await prisma.emailLog.findMany({
    where: { status: { in: ["queued", "approved"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const openReports = await prisma.report.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const objections = await prisma.objection.findMany({
    where: { status: { in: ["open", "awaiting_user", "kept_disputed"] } },
    include: { complaint: { include: { company: true } } },
  });
  const companies = await prisma.company.findMany();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">運営管理(admin)</h1>

      {/* フラグ */}
      <Section title="フラグ制御">
        <div className="space-y-2">
          <FlagToggle flagKey="gate_enabled" value={flags.gate_enabled} label="閲覧ゲート" />
          <p className="pl-1 text-xs text-slate-400">
            公開レビュー総数: {reviewCount}件(200件超で自動ON。手動上書き可)
          </p>
          <FlagToggle flagKey="monetization_enabled" value={flags.monetization_enabled} label="課金開始(個人閲覧プラン)" />
          <FlagToggle flagKey="live_enabled" value={flags.live_enabled} label="ライブレーン公開" />
        </div>
      </Section>

      {/* ①live承認 */}
      <Section title={`① ライブ投稿の公開承認(${pendingLive.length})`}>
        {pendingLive.length === 0 && <Empty />}
        {pendingLive.map((c) => (
          <Row key={c.id}>
            <span className="truncate text-sm">{c.company.name}:{c.title}</span>
            <AdminActionButton payload={{ type: "approve_live", complaintId: c.id }} label="承認・通知" className="btn-primary" />
          </Row>
        ))}
      </Section>

      {/* ②通知メール承認 */}
      <Section title={`② 企業通知メールの承認(${queuedEmails.length})`}>
        {queuedEmails.length === 0 && <Empty />}
        {queuedEmails.map((e) => (
          <Row key={e.id}>
            <span className="truncate text-xs">
              <span className={`chip mr-1 ${e.status === "queued" ? "bg-amber-100 text-amber-700" : "bg-slate-100"}`}>{e.status}</span>
              {e.to} / {e.subject}
            </span>
            {e.status !== "sent" && (
              <AdminActionButton payload={{ type: "approve_email", emailLogId: e.id }} label="送信承認" />
            )}
          </Row>
        ))}
      </Section>

      {/* ③通報 */}
      <Section title={`③ 通報対応(${openReports.length})`}>
        {openReports.length === 0 && <Empty />}
        {openReports.map((r) => (
          <Row key={r.id}>
            <span className="truncate text-xs">[{r.targetType}] {r.reason}</span>
            <span className="flex gap-1">
              <AdminActionButton payload={{ type: "report", reportId: r.id, status: "actioned" }} label="対応済" />
              <AdminActionButton payload={{ type: "report", reportId: r.id, status: "dismissed" }} label="却下" />
            </span>
          </Row>
        ))}
      </Section>

      {/* ④異議の期限管理 */}
      <Section title={`④ 異議の期限管理(${objections.length})`}>
        <p className="mb-2 text-xs text-slate-400">
          判定は投稿者本人。運営は無応答時の自動非表示処理のみ行います。
        </p>
        <AdminActionButton payload={{ type: "auto_hide_objections" }} label="期限切れを自動非表示にする" className="btn-outline" />
        <div className="mt-2 space-y-1">
          {objections.map((o) => (
            <Row key={o.id}>
              <span className="truncate text-xs">
                {o.complaint.company.name} / 期限 {o.userReplyDeadline.toLocaleDateString("ja-JP")} / {o.status}
              </span>
            </Row>
          ))}
        </div>
      </Section>

      {/* 企業凍結 */}
      <Section title="企業スコアの凍結(不正検知)">
        {companies.map((c) => (
          <Row key={c.id}>
            <span className="truncate text-sm">
              {c.name} {c.frozen && <span className="chip bg-slate-200 text-slate-600">審査中</span>}
            </span>
            <AdminActionButton
              payload={{ type: "freeze", companyId: c.id, frozen: !c.frozen }}
              label={c.frozen ? "凍結解除" : "凍結"}
            />
          </Row>
        ))}
      </Section>

      {/* BAN / strike */}
      <Section title="ユーザーのモデレーション(BAN / ストライク)">
        {users.map((u) => (
          <Row key={u.id}>
            <span className="truncate text-xs">
              {u.displayName} / warn {u.strikes} {u.bannedAt && <span className="chip bg-rose-100 text-rose-700">BAN</span>}
            </span>
            {!u.bannedAt && (
              <span className="flex gap-1">
                <AdminActionButton payload={{ type: "strike", userId: u.id, severity: "warn", reason: "manual" }} label="warn" />
                <AdminActionButton payload={{ type: "strike", userId: u.id, severity: "severe", reason: "manual" }} label="即BAN" className="btn bg-rose-600 text-white" confirm="即BANします。よろしいですか?" />
              </span>
            )}
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-2">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 first:border-0">{children}</div>;
}
function Empty() {
  return <p className="text-xs text-slate-400">対応待ちはありません。</p>;
}
