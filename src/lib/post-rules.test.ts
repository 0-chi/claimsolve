import { describe, it, expect } from "vitest";
import {
  canPostBody,
  grantsViewPass,
  bodyCounterState,
  canAddReviewForCompany,
  canAddSilentForCompany,
  canAddStaffForCompany,
  canPostStaffBody,
  canPostToday,
  validSilenceReasons,
  validActionNoteBody,
  validOfferBody,
  canAddHelpfulToday,
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

describe("staff(担当者への申し出)の制限", () => {
  it("本文80字未満は投稿不可", () => {
    expect(canPostStaffBody(repeat(79))).toBe(false);
    expect(canPostStaffBody(repeat(80))).toBe(true);
  });
  it("同一企業への staff は2件まで", () => {
    expect(canAddStaffForCompany(0)).toBe(true);
    expect(canAddStaffForCompany(1)).toBe(true);
    expect(canAddStaffForCompany(2)).toBe(false);
  });
});

describe("対策バッジ/解決の申し出/参考になった の制限", () => {
  it("対策バッジ本文は80字以上500字以下", () => {
    expect(validActionNoteBody(repeat(79))).toBe(false);
    expect(validActionNoteBody(repeat(80))).toBe(true);
    expect(validActionNoteBody(repeat(500))).toBe(true);
    expect(validActionNoteBody(repeat(501))).toBe(false);
  });
  it("解決の申し出は80字以上", () => {
    expect(validOfferBody(repeat(79))).toBe(false);
    expect(validOfferBody(repeat(80))).toBe(true);
  });
  it("「参考になった」は1企業1日10件まで", () => {
    expect(canAddHelpfulToday(9)).toBe(true);
    expect(canAddHelpfulToday(10)).toBe(false);
  });
});

describe("silent の制限", () => {
  it("同一企業への silent は1件まで(2件目はブロック)", () => {
    expect(canAddSilentForCompany(0)).toBe(true);
    expect(canAddSilentForCompany(1)).toBe(false);
  });

  it("沈黙理由は1〜2個必須。0個・3個は不可", () => {
    expect(validSilenceReasons([])).toBe(false);
    expect(validSilenceReasons(["too_much_hassle"])).toBe(true);
    expect(validSilenceReasons(["too_much_hassle", "felt_pointless"])).toBe(true);
    expect(validSilenceReasons(["a", "b", "c"])).toBe(false);
    // 重複は1つに畳んで判定
    expect(validSilenceReasons(["too_much_hassle", "too_much_hassle"])).toBe(true);
  });
});
