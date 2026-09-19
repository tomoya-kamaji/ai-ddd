import { describe, expect, it } from "vitest";
import { Match } from "../../src/domain/match-history/match";
import {
  matchM001,
  playerP001,
  playerP002,
  season2026,
  unrecordedM001,
} from "../fixtures";

describe("Match.create", () => {
  it("未集計の対局を作る", () => {
    const result = Match.create(matchM001, season2026, "Elf", playerP001, playerP002);
    expect(result._unsafeUnwrap()).toEqual(unrecordedM001);
  });

  it("勝者と同じ敗者は作れない", () => {
    const result = Match.create(matchM001, season2026, "Elf", playerP001, playerP001);
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "WinnerEqualsLoser",
      playerId: playerP001,
    });
  });
});

describe("Match.record", () => {
  it("未集計だけを集計済みにする", () => {
    const created = Match.create(
      matchM001,
      season2026,
      "Elf",
      playerP001,
      playerP002,
    )._unsafeUnwrap();
    expect(Match.record(created)).toEqual({
      kind: "Recorded",
      id: matchM001,
      seasonId: season2026,
      craft: "Elf",
      winnerId: playerP001,
      loserId: playerP002,
    });
  });
});
