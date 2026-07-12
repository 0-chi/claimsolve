// past投稿の品質下限・レート制限(§5.1-6)。純関数でテスト可能。

export const MIN_POST_CHARS = 50; // これ未満は投稿不可
export const MIN_VIEWPASS_CHARS = 100; // 閲覧権付与の下限
export const MAX_REVIEWS_PER_COMPANY = 2; // 同一企業へは1ユーザー2件まで
export const MAX_POSTS_PER_DAY = 2; // 1ユーザー1日2件まで

// 本文の文字数(前後空白を除く)。
export function bodyLength(body: string): number {
  return body.trim().length;
}

export function canPostBody(body: string): boolean {
  return bodyLength(body) >= MIN_POST_CHARS;
}

export function grantsViewPass(body: string): boolean {
  return bodyLength(body) >= MIN_VIEWPASS_CHARS;
}

// 投稿可能まで/閲覧権獲得まで の2段階カウンター表示用。
export function bodyCounterState(body: string): {
  length: number;
  toPost: number; // 投稿可能まで残り文字数(0=クリア)
  toViewPass: number; // 閲覧権獲得まで残り文字数(0=クリア)
} {
  const len = bodyLength(body);
  return {
    length: len,
    toPost: Math.max(0, MIN_POST_CHARS - len),
    toViewPass: Math.max(0, MIN_VIEWPASS_CHARS - len),
  };
}

export function canAddReviewForCompany(existingCount: number): boolean {
  return existingCount < MAX_REVIEWS_PER_COMPANY;
}

export function canPostToday(todayCount: number): boolean {
  return todayCount < MAX_POSTS_PER_DAY;
}
