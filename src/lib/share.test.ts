import { describe, it, expect } from "vitest";
import { shareCooldownOk, nextShareAvailableAt, SHARE_COOLDOWN_DAYS } from "./share";

const DAY = 24 * 60 * 60 * 1000;

describe("シェアの7日クールダウン", () => {
  it("初回(履歴なし)は許可", () => {
    expect(shareCooldownOk(null)).toBe(true);
  });
  it("7日未満は不可、7日以上で再度許可", () => {
    const last = new Date(2026, 0, 1);
    expect(shareCooldownOk(last, new Date(last.getTime() + 6 * DAY))).toBe(false);
    expect(shareCooldownOk(last, new Date(last.getTime() + 7 * DAY))).toBe(true);
  });
  it("次回可能日時は+7日", () => {
    const last = new Date(2026, 0, 1);
    expect(nextShareAvailableAt(last)).toEqual(new Date(last.getTime() + SHARE_COOLDOWN_DAYS * DAY));
  });
});
