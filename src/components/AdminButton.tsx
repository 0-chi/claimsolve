"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminActionButton({
  payload,
  label,
  className = "btn-outline",
  confirm,
}: {
  payload: Record<string, unknown>;
  label: string;
  className?: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={run} disabled={busy} className={`${className} !px-3 !py-1 text-xs`}>
      {busy ? "…" : label}
    </button>
  );
}

export function FlagToggle({ flagKey, value, label }: { flagKey: string; value: boolean; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await fetch("/api/admin/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: flagKey, value: !value }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-400">{flagKey}</div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`chip ${value ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}
      >
        {value ? "ON" : "OFF"}
      </button>
    </div>
  );
}
