import { describe, it, expect } from "vitest";
import {
  computeCompanyScore,
  computeSilentStats,
  deriveSolved,
  reachedResolution,
  within24Months,
  computeIr,
  badgeForAr,
  type ScoreReviewInput,
  type LiveComplaintInput,
} from "./scoring";

function reviews(n: number, r: Partial<ScoreReviewInput> = {}): ScoreReviewInput[] {
  return Array.from({ length: n }, () => ({
    satisfaction: 8,
    outcome: "full_refund",
    wouldUseAgain: true,
    ...r,
  }));
}

describe("outcome → solved 導出", () => {
  it("no_action と apology_only は false、それ以外は true", () => {
    expect(deriveSolved("no_action")).toBe(false);
    expect(deriveSolved("apology_only")).toBe(false);
    expect(deriveSolved("full_refund")).toBe(true);
    expect(deriveSolved("partial_refund")).toBe(true);
    expect(deriveSolved("replacement")).toBe(true);
  });

  it("RS用の到達判定は no_action のみ false(apology_only は到達)", () => {
    expect(reachedResolution("no_action")).toBe(false);
    expect(reachedResolution("apology_only")).toBe(true);
    expect(reachedResolution("full_refund")).toBe(true);
  });
});

describe("5件未満は集計中", () => {
  it("4件ではスコア非表示", () => {
    const s = computeCompanyScore(reviews(4));
    expect(s.aggregating).toBe(true);
    expect(s.ar).toBeNull();
  });
});

describe("AR式(IRあり)", () => {
  it("MA8/RS100/IN100/IR50 → AR 8.4", () => {
    const live: LiveComplaintInput[] = [
      { status: "replied", notifiedAt: new Date(), firstReplyAt: new Date() },
      { status: "published_awaiting", notifiedAt: new Date(), firstReplyAt: null },
    ];
    const s = computeCompanyScore(reviews(5), live);
    expect(s.ir).toBe(50);
    expect(s.ma).toBe(8);
    expect(s.rs).toBe(100);
    expect(s.in).toBe(100);
    // (50*2 + 8*10*3 + 100*3 + 100*2)/100 = 840/100 = 8.4
    expect(s.ar).toBe(8.4);
    expect(s.badge).toBe("excellent");
  });
});

describe("AR式(IRなし)", () => {
  it("live案件が無い/計算不能なら ÷80 の式", () => {
    const s = computeCompanyScore(reviews(5)); // liveなし
    expect(s.ir).toBeNull();
    // (8*10*3 + 100*3 + 100*2)/80 = 740/80 = 9.25 → 9.3
    expect(s.ar).toBe(9.3);
  });

  it("通知未達の live のみでも IR は null 扱い", () => {
    const live: LiveComplaintInput[] = [
      { status: "published_unnotified", notifiedAt: null, firstReplyAt: null },
    ];
    expect(computeIr(live)).toBeNull();
    const s = computeCompanyScore(reviews(5), live);
    expect(s.ir).toBeNull();
    expect(s.ar).toBe(9.3);
  });
});

describe("IR分母の除外", () => {
  it("published_unnotified と awaiting_eval_paused は分母から除外", () => {
    const live: LiveComplaintInput[] = [
      { status: "published_unnotified", notifiedAt: new Date(), firstReplyAt: null },
      { status: "awaiting_eval_paused", notifiedAt: new Date(), firstReplyAt: null },
      { status: "replied", notifiedAt: new Date(), firstReplyAt: new Date() },
    ];
    // 有効分母は「replied」の1件のみ → IR = 100
    expect(computeIr(live)).toBe(100);
  });
});

describe("バッジ境界", () => {
  it("8.0=優良 / 7.0=良好 / 6.0=普通 / 未満=改善余地", () => {
    expect(badgeForAr(8.0)).toBe("excellent");
    expect(badgeForAr(7.9)).toBe("good");
    expect(badgeForAr(7.0)).toBe("good");
    expect(badgeForAr(6.9)).toBe("fair");
    expect(badgeForAr(6.0)).toBe("fair");
    expect(badgeForAr(5.9)).toBe("needs_improvement");
  });
});

describe("SR(沈黙率)/ UR(窓口不達率)", () => {
  it("総件数5件未満は SR 非表示(null)", () => {
    const s = computeSilentStats(4, [["felt_pointless"]]);
    expect(s.sr).toBeNull();
  });

  it("SR = silent ÷ 総件数 ×100", () => {
    // 総10件のうち silent 3件 → SR 30%
    const s = computeSilentStats(10, [
      ["too_much_hassle"],
      ["felt_pointless"],
      ["no_contact_found"],
    ]);
    expect(s.sr).toBe(30);
  });

  it("silent5件未満は UR 非表示、5件以上で算出", () => {
    const under = computeSilentStats(20, [
      ["no_contact_found"],
      ["could_not_reach"],
      ["felt_pointless"],
      ["feared_conflict"],
    ]);
    expect(under.ur).toBeNull(); // silent4件

    const ok = computeSilentStats(20, [
      ["no_contact_found"], // 不達
      ["could_not_reach"], // 不達
      ["no_reply_received"], // 不達
      ["felt_pointless"], // 非不達
      ["feared_conflict"], // 非不達
    ]);
    // 5件中3件が不達 → UR 60%
    expect(ok.ur).toBe(60);
    expect(ok.unreachableBreakdown).toEqual({
      no_contact_found: 1,
      could_not_reach: 1,
      no_reply_received: 1,
    });
  });

  it("1件で複数理由でも不達は二重計上しない(件数ベース)", () => {
    const s = computeSilentStats(10, [
      ["no_contact_found", "could_not_reach"], // 不達2つだが1件
      ["felt_pointless"],
      ["felt_pointless"],
      ["felt_pointless"],
      ["felt_pointless"],
    ]);
    // 5件中 不達は1件 → UR 20%
    expect(s.ur).toBe(20);
    expect(s.unreachableBreakdown.no_contact_found).toBe(1);
    expect(s.unreachableBreakdown.could_not_reach).toBe(1);
  });
});

describe("直近24ヶ月境界", () => {
  const now = new Date(2026, 6, 12); // 2026-07-12
  it("24ヶ月前(2024-07)は対象、25ヶ月前(2024-06)は対象外", () => {
    expect(within24Months({ occurredYearMonth: "2024-07" }, now)).toBe(true);
    expect(within24Months({ occurredYearMonth: "2024-06" }, now)).toBe(false);
    expect(within24Months({ occurredYearMonth: "2026-07" }, now)).toBe(true);
  });
  it("live は評価確定日で判定", () => {
    expect(within24Months({ evalDate: new Date(2025, 0, 1) }, now)).toBe(true);
    expect(within24Months({ evalDate: new Date(2023, 0, 1) }, now)).toBe(false);
  });
});
