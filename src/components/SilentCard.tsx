import { SILENCE_REASON_LABELS, UNREACHABLE_REASONS, type SilenceReason } from "@/lib/scoring";
import { yearMonthLabel } from "@/lib/labels";

export interface SilentReportView {
  id: string;
  title: string;
  body: string;
  occurredYearMonth: string | null;
  silenceReasons: string[];
  silentWouldUseAgain: boolean | null;
  desiredOutcome: string | null;
  kycStatus: string;
  disputed: boolean;
}

export function SilentCard({ report }: { report: SilentReportView }) {
  return (
    <article className="card space-y-2 border-slate-200">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{yearMonthLabel(report.occurredYearMonth)}</span>
        <div className="flex items-center gap-1">
          {report.kycStatus === "verified" && (
            <span className="chip bg-emerald-50 text-emerald-700">本人確認済み</span>
          )}
          {report.disputed && <span className="chip bg-rose-50 text-rose-700">係争中</span>}
        </div>
      </div>

      {/* なぜ言わなかったか(自己申告) */}
      <div className="flex flex-wrap gap-1">
        {report.silenceReasons.map((r) => {
          const unreachable = UNREACHABLE_REASONS.includes(r as SilenceReason);
          return (
            <span
              key={r}
              className={`chip ${unreachable ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
            >
              {SILENCE_REASON_LABELS[r as SilenceReason] ?? r}
            </span>
          );
        })}
      </div>

      <p className="whitespace-pre-wrap text-sm text-slate-700">{report.body}</p>

      {report.desiredOutcome && (
        <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
          本当はどうしてほしかったか: {report.desiredOutcome}
        </p>
      )}
      {report.silentWouldUseAgain != null && (
        <p className="text-xs text-slate-400">
          また使うか: {report.silentWouldUseAgain ? "使う" : "使わない"}
        </p>
      )}
    </article>
  );
}
