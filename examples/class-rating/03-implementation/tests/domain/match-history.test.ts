import { describe, expect, it } from "vitest";
import { Match } from "../../src/domain/match-history/match";
import { MatchHistory } from "../../src/domain/match-history/match-history";
import { season2026, season2026Next, unrecordedM001 } from "../fixtures";

describe("MatchHistory.record", () => {
  it("未集計の対局を一度だけ残す", () => {
    const recorded = MatchHistory.record(MatchHistory.empty(), unrecordedM001);
    expect(recorded.isOk()).toBe(true);
    expect(recorded._unsafeUnwrap().matches).toEqual([Match.record(unrecordedM001)]);
  });

  it("同じ対局は二度集計しない", () => {
    const first = MatchHistory.record(MatchHistory.empty(), unrecordedM001)._unsafeUnwrap();
    const second = MatchHistory.record(first, unrecordedM001);
    expect(second._unsafeUnwrapErr()).toEqual({
      kind: "AlreadyRecorded",
      matchId: "M001",
    });
  });
});

describe("MatchHistory.inSeason", () => {
  it("指定シーズンの対局だけ返す", () => {
    const recorded = MatchHistory.record(
      MatchHistory.empty(),
      unrecordedM001,
    )._unsafeUnwrap();
    expect(MatchHistory.inSeason(recorded, season2026)).toHaveLength(1);
    expect(MatchHistory.inSeason(recorded, season2026Next)).toEqual([]);
  });
});
