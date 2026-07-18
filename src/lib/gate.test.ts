import { describe, it, expect } from "vitest";
import {
  shouldGateBeOn,
  effectiveViewPassExpiry,
  isViewPassActive,
  latestAccessExpiry,
  GATE_THRESHOLD,
} from "./gate";

describe("ゲート200件境界", () => {
  it("200件以下はOFF、201件目でON", () => {
    expect(GATE_THRESHOLD).toBe(200);
    expect(shouldGateBeOn(199)).toBe(false);
    expect(shouldGateBeOn(200)).toBe(false);
    expect(shouldGateBeOn(201)).toBe(true);
  });
});

describe("ViewPass 有効期限の読み替え(review由来=ON日から1ヶ月)", () => {
  const gateActivatedAt = new Date(2026, 0, 1); // 2026-01-01 にゲートON

  it("ゲートON前に発行された review由来 ViewPass は『ON日から1ヶ月』に読み替え", () => {
    const pass = {
      createdAt: new Date(2025, 11, 1), // ON前に発行
      expiresAt: new Date(2025, 11, 31), // 本来はもっと早く失効
      source: "review",
    };
    const eff = effectiveViewPassExpiry(pass, gateActivatedAt);
    expect(eff).toEqual(new Date(2026, 1, 1)); // 2026-02-01(+1ヶ月)
    expect(isViewPassActive(pass, gateActivatedAt, new Date(2026, 0, 15))).toBe(true);
    expect(isViewPassActive(pass, gateActivatedAt, new Date(2026, 2, 1))).toBe(false);
  });

  it("share由来はゲートON前でも読み替えず元の24時間期限のまま", () => {
    const pass = {
      createdAt: new Date(2025, 11, 1),
      expiresAt: new Date(2025, 11, 2),
      source: "share",
    };
    expect(effectiveViewPassExpiry(pass, gateActivatedAt)).toEqual(new Date(2025, 11, 2));
  });

  it("ゲートON後に発行された ViewPass は元の期限のまま", () => {
    const pass = { createdAt: new Date(2026, 1, 1), expiresAt: new Date(2026, 2, 1), source: "review" };
    expect(effectiveViewPassExpiry(pass, gateActivatedAt)).toEqual(new Date(2026, 2, 1));
  });

  it("ゲート未発動なら元の期限のまま", () => {
    const pass = { createdAt: new Date(2026, 1, 1), expiresAt: new Date(2026, 2, 1), source: "review" };
    expect(effectiveViewPassExpiry(pass, null)).toEqual(new Date(2026, 2, 1));
  });
});

describe("複数ViewPassの有効期限合成(最も遅い期限を採用)", () => {
  it("review(1ヶ月)/silent(3日)/share(24h)/subscription を合成し最遅を返す", () => {
    const now = new Date(2026, 5, 1);
    const review = { createdAt: now, expiresAt: new Date(2026, 6, 1), source: "review" }; // +1ヶ月
    const silent = { createdAt: now, expiresAt: new Date(2026, 5, 4), source: "silent" }; // +3日
    const share = { createdAt: now, expiresAt: new Date(2026, 5, 2), source: "share" }; // +24h
    const subEnd = new Date(2026, 8, 1); // 契約はさらに先
    expect(latestAccessExpiry([silent, share], null, null)).toEqual(new Date(2026, 5, 4)); // silentが最遅
    expect(latestAccessExpiry([review, silent, share], subEnd, null)).toEqual(new Date(2026, 8, 1));
    expect(latestAccessExpiry([review, silent, share], null, null)).toEqual(new Date(2026, 6, 1));
    expect(latestAccessExpiry([], null, null)).toBeNull();
  });

  it("silent由来はゲートON前でも読み替えない(3日のまま)", () => {
    const gateOn = new Date(2026, 0, 1);
    const silent = { createdAt: new Date(2025, 11, 20), expiresAt: new Date(2025, 11, 23), source: "silent" };
    expect(effectiveViewPassExpiry(silent, gateOn)).toEqual(new Date(2025, 11, 23));
  });
});
