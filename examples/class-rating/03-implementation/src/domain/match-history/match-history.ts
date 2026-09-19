import { err, ok, type Result } from "neverthrow";
import type { SeasonId } from "../season/season";
import { Match, type MatchId, type Recorded, type Unrecorded } from "./match";

export type MatchHistory = Readonly<{
  matches: readonly Recorded[];
}>;

export type RecordMatchError = Readonly<{
  kind: "AlreadyRecorded";
  matchId: MatchId;
}>;

export const MatchHistory = {
  empty: (): MatchHistory => ({ matches: [] }),

  has: (history: MatchHistory, matchId: MatchId) =>
    history.matches.some((match) => match.id === matchId),

  inSeason: (history: MatchHistory, seasonId: SeasonId) =>
    history.matches.filter((match) => match.seasonId === seasonId),

  // R3: 同じ対局は一度だけ。済みの id は拒否
  record: (
    history: MatchHistory,
    match: Unrecorded,
  ): Result<MatchHistory, RecordMatchError> =>
    MatchHistory.has(history, match.id)
      ? err({ kind: "AlreadyRecorded", matchId: match.id })
      : ok({
          matches: [...history.matches, Match.record(match)],
        }),
} as const;
