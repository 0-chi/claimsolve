import type { ScoreResult } from "@/lib/scoring";

function Metric({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold tabular-nums text-slate-900">
        {value == null ? "—" : value}
        {value != null && suffix ? <span className="text-xs font-normal text-slate-400">{suffix}</span> : null}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

export function MetricSummary({ score }: { score: ScoreResult }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Metric label="納得度(MA)" value={score.ma} suffix="/10" />
      <Metric label="解決到達(RS)" value={score.rs} suffix="%" />
      <Metric label="また使う(IN)" value={score.in} suffix="%" />
      <Metric label="ライブ返答(IR)" value={score.ir} suffix="%" />
    </div>
  );
}
