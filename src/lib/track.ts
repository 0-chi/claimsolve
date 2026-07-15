// 計測イベント(v1.5 §7)。GA4 未導入(gtag 不在)のときは no-op。
// KPI: 投稿開始/完了(レーン別)・離脱時のレーン切替・ウォッチ登録 等。
export function track(event: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params ?? {});
  }
}
