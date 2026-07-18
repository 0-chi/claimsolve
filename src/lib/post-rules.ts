// past投稿の品質下限・レート制限(§5.1-6)。純関数でテスト可能。

export const MIN_POST_CHARS = 50; // これ未満は投稿不可
export const MIN_VIEWPASS_CHARS = 100; // past 閲覧権付与の下限
export const MAX_REVIEWS_PER_COMPANY = 2; // 同一企業への past は1ユーザー2件まで
export const MAX_SILENT_PER_COMPANY = 1; // 同一企業への silent は1ユーザー1件まで
export const MAX_STAFF_PER_COMPANY = 2; // 同一企業への staff は1ユーザー2件まで
export const MAX_POSTS_PER_DAY = 2; // 1ユーザー1日2件まで(全レーン合算)
export const MAX_SILENCE_REASONS = 2; // 沈黙理由は最大2つ
export const MIN_SILENCE_REASONS = 1; // 最低1つ

export const MIN_STAFF_CHARS = 80; // staff 本文下限
export const MIN_ACTION_NOTE_CHARS = 80; // 対策バッジ本文下限
export const MAX_ACTION_NOTE_CHARS = 500; // 対策バッジ本文上限
export const MIN_OFFER_CHARS = 80; // 解決の申し出 本文下限
export const MAX_HELPFUL_PER_DAY = 10; // 「参考になった」1企業1日10件まで

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

export function canAddSilentForCompany(existingCount: number): boolean {
  return existingCount < MAX_SILENT_PER_COMPANY;
}

export function canPostToday(todayCount: number): boolean {
  return todayCount < MAX_POSTS_PER_DAY;
}

// 沈黙理由は1〜2個必須。3個目以降は不可。
export function validSilenceReasons(reasons: string[]): boolean {
  const uniq = Array.from(new Set(reasons));
  return uniq.length >= MIN_SILENCE_REASONS && uniq.length <= MAX_SILENCE_REASONS;
}

export function canPostStaffBody(body: string): boolean {
  return bodyLength(body) >= MIN_STAFF_CHARS;
}

export function canAddStaffForCompany(existingCount: number): boolean {
  return existingCount < MAX_STAFF_PER_COMPANY;
}

// 対策バッジ本文: 80字以上・500字以下(§5.7-(1))
export function validActionNoteBody(body: string): boolean {
  const len = bodyLength(body);
  return len >= MIN_ACTION_NOTE_CHARS && len <= MAX_ACTION_NOTE_CHARS;
}

export function validOfferBody(body: string): boolean {
  return bodyLength(body) >= MIN_OFFER_CHARS;
}

export function canAddHelpfulToday(todayCount: number): boolean {
  return todayCount < MAX_HELPFUL_PER_DAY;
}
