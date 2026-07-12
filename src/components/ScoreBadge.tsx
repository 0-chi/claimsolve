import { BADGE_LABELS, type ScoreBadge } from "@/lib/scoring";

const STYLES: Record<ScoreBadge, string> = {
  excellent: "bg-emerald-100 text-emerald-800",
  good: "bg-sky-100 text-sky-800",
  fair: "bg-amber-100 text-amber-800",
  needs_improvement: "bg-rose-100 text-rose-800",
};

export function ScoreBadgePill({ badge }: { badge: ScoreBadge }) {
  return <span className={`chip ${STYLES[badge]}`}>{BADGE_LABELS[badge]}</span>;
}

export function ScoreNumber({
  ar,
  aggregating,
}: {
  ar: number | null;
  aggregating: boolean;
}) {
  if (aggregating || ar == null) {
    return <span className="text-lg font-semibold text-slate-400">集計中</span>;
  }
  return (
    <span className="text-3xl font-bold tabular-nums text-slate-900">
      {ar.toFixed(1)}
      <span className="ml-0.5 text-base font-normal text-slate-400">/10</span>
    </span>
  );
}
