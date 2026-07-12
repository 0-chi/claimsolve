import { describe, it, expect } from "vitest";
import {
  shouldGateBeOn,
  effectiveViewPassExpiry,
  isViewPassActive,
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

describe("ViewPass 有効期限の読み替え", () => {
  const gateActivatedAt = new Date(2026, 0, 1); // 2026-01-01 にゲートON

  it("ゲートON前に発行された ViewPass は『ON日から3ヶ月』に読み替え", () => {
    const pass = {
      createdAt: new Date(2025, 11, 1), // ON前に発行
      expiresAt: new Date(2025, 11, 31), // 本来はもっと早く失効
    };
    const eff = effectiveViewPassExpiry(pass, gateActivatedAt);
    expect(eff).toEqual(new Date(2026, 3, 1)); // 2026-04-01(+3ヶ月)
    // 2026-02-01 時点ではまだ有効
    expect(isViewPassActive(pass, gateActivatedAt, new Date(2026, 1, 1))).toBe(true);
  });

  it("ゲートON後に発行された ViewPass は元の期限のまま", () => {
    const pass = {
      createdAt: new Date(2026, 1, 1),
      expiresAt: new Date(2026, 2, 1),
    };
    const eff = effectiveViewPassExpiry(pass, gateActivatedAt);
    expect(eff).toEqual(new Date(2026, 2, 1));
  });

  it("ゲート未発動なら元の期限のまま", () => {
    const pass = {
      createdAt: new Date(2026, 1, 1),
      expiresAt: new Date(2026, 2, 1),
    };
    expect(effectiveViewPassExpiry(pass, null)).toEqual(new Date(2026, 2, 1));
  });
});
