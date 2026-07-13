// 企業ウォッチ上限(§4)。投稿由来=1社 / 個人閲覧プラン加入中=5社。
export const WATCH_MAX_FREE = 1;
export const WATCH_MAX_SUBSCRIBER = 5;

export function maxWatchFor(hasActiveConsumerSub: boolean): number {
  return hasActiveConsumerSub ? WATCH_MAX_SUBSCRIBER : WATCH_MAX_FREE;
}
