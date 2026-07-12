import { describe, it, expect } from "vitest";
import {
  canPostBody,
  grantsViewPass,
  bodyCounterState,
  canAddReviewForCompany,
  canPostToday,
} from "./post-rules";

const repeat = (n: number) => "あ".repeat(n);

describe("本文の文字数下限", () => {
  it("50字未満は投稿不可", () => {
    expect(canPostBody(repeat(49))).toBe(false);
    expect(canPostBody(repeat(50))).toBe(true);
  });

  it("50〜100字は投稿可だが閲覧権は付与されない", () => {
    expect(canPostBody(repeat(75))).toBe(true);
    expect(grantsViewPass(repeat(75))).toBe(false);
    expect(grantsViewPass(repeat(99))).toBe(false);
  });

  it("100字以上で閲覧権付与", () => {
    expect(grantsViewPass(repeat(100))).toBe(true);
  });

  it("前後の空白は文字数に含めない", () => {
    expect(canPostBody("  " + repeat(48) + "  ")).toBe(false);
  });
});

describe("2段階カウンター", () => {
  it("投稿可能まで/閲覧権獲得までの残り文字数", () => {
    const c = bodyCounterState(repeat(60));
    expect(c.length).toBe(60);
    expect(c.toPost).toBe(0);
    expect(c.toViewPass).toBe(40);
  });
});

describe("同一企業への件数制限", () => {
  it("2件までは可、3件目はブロック", () => {
    expect(canAddReviewForCompany(0)).toBe(true);
    expect(canAddReviewForCompany(1)).toBe(true);
    expect(canAddReviewForCompany(2)).toBe(false);
  });
});

describe("1日の投稿数制限", () => {
  it("1日2件まで", () => {
    expect(canPostToday(0)).toBe(true);
    expect(canPostToday(1)).toBe(true);
    expect(canPostToday(2)).toBe(false);
  });
});
