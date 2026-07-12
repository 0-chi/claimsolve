import { describe, it, expect } from "vitest";
import { computeUnlock, unlockThresholdDays, MS_PER_DAY } from "./unlock";

describe("解禁しきい値の日数", () => {
  it("返答率50%未満=7日 / 50%以上=14日 / 計算不能=7日", () => {
    expect(unlockThresholdDays(null)).toBe(7);
    expect(unlockThresholdDays(0)).toBe(7);
    expect(unlockThresholdDays(49)).toBe(7);
    expect(unlockThresholdDays(50)).toBe(14);
    expect(unlockThresholdDays(80)).toBe(14);
  });
});

describe("評価解禁", () => {
  const published = new Date(2026, 0, 1);

  it("企業が返答したら即解禁", () => {
    const r = computeUnlock(
      { publishedAt: published, firstReplyAt: new Date(2026, 0, 2), companyReplyRate: 80 },
      new Date(2026, 0, 3)
    );
    expect(r.unlocked).toBe(true);
    expect(r.reason).toBe("company_replied");
  });

  it("返答率50%未満は7日で解禁", () => {
    const day6 = new Date(published.getTime() + 6 * MS_PER_DAY);
    const day7 = new Date(published.getTime() + 7 * MS_PER_DAY);
    expect(
      computeUnlock({ publishedAt: published, firstReplyAt: null, companyReplyRate: 20 }, day6)
        .unlocked
    ).toBe(false);
    expect(
      computeUnlock({ publishedAt: published, firstReplyAt: null, companyReplyRate: 20 }, day7)
        .unlocked
    ).toBe(true);
  });

  it("返答率50%以上は14日で解禁", () => {
    const day13 = new Date(published.getTime() + 13 * MS_PER_DAY);
    const day14 = new Date(published.getTime() + 14 * MS_PER_DAY);
    expect(
      computeUnlock({ publishedAt: published, firstReplyAt: null, companyReplyRate: 60 }, day13)
        .unlocked
    ).toBe(false);
    expect(
      computeUnlock({ publishedAt: published, firstReplyAt: null, companyReplyRate: 60 }, day14)
        .unlocked
    ).toBe(true);
  });

  it("返答率が計算不能な企業は7日で解禁", () => {
    const day7 = new Date(published.getTime() + 7 * MS_PER_DAY);
    const r = computeUnlock(
      { publishedAt: published, firstReplyAt: null, companyReplyRate: null },
      day7
    );
    expect(r.thresholdDays).toBe(7);
    expect(r.unlocked).toBe(true);
  });
});
