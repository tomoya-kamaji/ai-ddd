import { describe, expect, it } from "vitest";
import { Rating } from "../../src/domain/rating/rating";
import {
  playerP001,
  playerP010,
  playerP011,
  playerP012,
  rating1600,
  rating1640P001,
  rating1640P002,
  rating1800,
  rating1850,
} from "../fixtures";

describe("Rating.start", () => {
  it("開始値は 1600。肩書きはなし", () => {
    const rating = Rating.start(playerP001, "Elf", rating1600.seasonId);
    expect(rating).toEqual(rating1600);
    expect(Rating.grade(rating)).toBe("None");
  });
});

describe("Rating.apply", () => {
  it("同レートの勝ちは +16、負けは -16", () => {
    const winner = Rating.apply(rating1640P001, rating1640P002, "win");
    const loser = Rating.apply(rating1640P002, rating1640P001, "lose");
    expect(winner.value).toBe(1656);
    expect(loser.value).toBe(1624);
    expect(Rating.grade(winner)).toBe("EPIC");
    expect(Rating.grade(loser)).toBe("None");
  });

  it("1800 視点では 1850 相手の勝ち +18、負け -14", () => {
    const win = Rating.apply(rating1800, rating1850, "win");
    const lose = Rating.apply(rating1800, rating1850, "lose");
    expect(win.value).toBe(1818);
    expect(lose.value).toBe(1786);
  });

  it("1800 が 1850 に勝った対局では、1850 は -18", () => {
    const winner = Rating.apply(rating1800, rating1850, "win");
    const loser = Rating.apply(rating1850, rating1800, "lose");
    expect(winner.value).toBe(1818);
    expect(loser.value).toBe(1832);
  });

  it("元のレーティングは変えない", () => {
    Rating.apply(rating1640P001, rating1640P002, "win");
    expect(rating1640P001.value).toBe(1640);
  });
});

describe("Rating.rank", () => {
  it("値の大きい順に順位を付け、1850以上かつ上位100を BEYOND にする", () => {
    const ranked = Rating.rank([
      { playerId: playerP012, craft: "Elf", seasonId: rating1600.seasonId, value: 1640 },
      { playerId: playerP010, craft: "Elf", seasonId: rating1600.seasonId, value: 1860 },
      { playerId: playerP011, craft: "Elf", seasonId: rating1600.seasonId, value: 1855 },
    ]);
    expect(ranked.map((row) => [row.rating.playerId, row.rank, row.grade])).toEqual([
      [playerP010, 1, "BEYOND"],
      [playerP011, 2, "BEYOND"],
      [playerP012, 3, "None"],
    ]);
  });
});
