import { describe, expect, it } from "vitest";
import { Grade } from "../../src/domain/rating/grade";

describe("Grade.of", () => {
  it.each([
    [1649, "None"],
    [1650, "EPIC"],
    [1749, "EPIC"],
    [1750, "ULTIMATE"],
    [1849, "ULTIMATE"],
    [1850, "LEGEND"],
  ] as const)("value %s は %s", (value, grade) => {
    expect(Grade.of(value)).toBe(grade);
  });

  it("順位なしでは BEYOND にならない", () => {
    expect(Grade.of(1860)).toBe("LEGEND");
  });
});

describe("Grade.ofRanked", () => {
  it("1850以上かつ1位は BEYOND", () => {
    expect(Grade.ofRanked(1860, 1)).toBe("BEYOND");
  });

  it("1850以上かつ100位は BEYOND", () => {
    expect(Grade.ofRanked(1855, 100)).toBe("BEYOND");
  });

  it("1850以上でも101位は LEGEND", () => {
    expect(Grade.ofRanked(1855, 101)).toBe("LEGEND");
  });

  it("1850未満は順位があっても帯のまま", () => {
    expect(Grade.ofRanked(1640, 1)).toBe("None");
  });
});
