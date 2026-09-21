import { describe, expect, it } from "vitest";
import { PlayerId } from "../../src/domain/rating/player";
import { Rating } from "../../src/domain/rating/rating";
import { Season } from "../../src/domain/season/season";
import {
  pendingSeason,
  rating1600,
  rating1860,
  season2026,
  season2026Next,
  seasonName2026,
} from "../fixtures";

describe("Season.compress", () => {
  it.each([
    [1860, 1750],
    [1850, 1750],
    [1849, 1650],
    [1750, 1650],
    [1749, 1600],
    [1600, 1600],
    [1599, 1550],
    [1550, 1550],
    [1549, 1520],
    [1520, 1520],
    [1519, 1500],
    [1480, 1500],
    [1479, 1479],
    [1400, 1400],
  ] as const)("%s を %s に寄せる", (before, after) => {
    const rating = {
      playerId: PlayerId.of("P001"),
      craft: "Elf" as const,
      seasonId: season2026,
      value: before,
    };
    const compressed = Season.compress(rating, season2026Next);
    expect(compressed.value).toBe(after);
    expect(compressed.seasonId).toBe(season2026Next);
    expect(rating.seasonId).toBe(season2026);
  });

  it("1860 を寄せると ULTIMATE になる", () => {
    const compressed = Season.compress(rating1860, season2026Next);
    expect(compressed.value).toBe(1750);
    expect(compressed.seasonId).toBe(season2026Next);
    expect(Rating.grade(compressed)).toBe("ULTIMATE");
  });

  it("1600 は 1600 のまま。消さない", () => {
    expect(Season.compress(rating1600, season2026Next).value).toBe(1600);
  });
});

describe("Season.markUpdated", () => {
  it("未更新だけを更新済みにする", () => {
    const created = Season.create(season2026, seasonName2026);
    expect(created).toEqual(pendingSeason);
    expect(Season.markUpdated(created)).toEqual({
      kind: "Updated",
      id: season2026,
      name: seasonName2026,
    });
  });
});

describe("Season.requirePending", () => {
  it("未更新ならPendingとして返す", () => {
    expect(Season.requirePending(pendingSeason)._unsafeUnwrap()).toEqual(
      pendingSeason,
    );
  });

  it("更新済みなら拒否する", () => {
    const updated = Season.markUpdated(pendingSeason);
    expect(Season.requirePending(updated)._unsafeUnwrapErr()).toEqual({
      kind: "SeasonNotPending",
      seasonId: season2026,
    });
  });
});

describe("Season.complete", () => {
  it("更新済みなら拒否する", () => {
    const updated = Season.markUpdated(Season.create(season2026, seasonName2026));
    expect(Season.complete(updated)._unsafeUnwrapErr()).toEqual({
      kind: "AlreadyUpdated",
      seasonId: season2026,
    });
  });
});
