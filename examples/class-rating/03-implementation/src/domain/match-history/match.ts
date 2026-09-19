import { err, ok, type Result } from "neverthrow";
import type { Craft } from "../rating/craft";
import type { PlayerId } from "../rating/player";
import type { SeasonId } from "../season/season";

declare const MatchIdBrand: unique symbol;
export type MatchId = string & { readonly [MatchIdBrand]: never };

export const MatchId = {
  // 生の文字列を MatchId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): MatchId => value as MatchId,
} as const;

export type Unrecorded = Readonly<{
  kind: "Unrecorded";
  id: MatchId;
  seasonId: SeasonId;
  craft: Craft;
  winnerId: PlayerId;
  loserId: PlayerId;
}>;

export type Recorded = Readonly<{
  kind: "Recorded";
  id: MatchId;
  seasonId: SeasonId;
  craft: Craft;
  winnerId: PlayerId;
  loserId: PlayerId;
}>;

export type Match = Unrecorded | Recorded;

export type CreateMatchError = Readonly<{
  kind: "WinnerEqualsLoser";
  playerId: PlayerId;
}>;

export const Match = {
  // 勝者と敗者は別人。必ず Unrecorded で生成する
  create: (
    id: MatchId,
    seasonId: SeasonId,
    craft: Craft,
    winnerId: PlayerId,
    loserId: PlayerId,
  ): Result<Unrecorded, CreateMatchError> =>
    winnerId === loserId
      ? err({ kind: "WinnerEqualsLoser", playerId: winnerId })
      : ok({
          kind: "Unrecorded",
          id,
          seasonId,
          craft,
          winnerId,
          loserId,
        }),

  // 引数型が Unrecorded なので Recorded を渡すとコンパイルエラー
  record: (match: Unrecorded): Recorded => ({
    kind: "Recorded",
    id: match.id,
    seasonId: match.seasonId,
    craft: match.craft,
    winnerId: match.winnerId,
    loserId: match.loserId,
  }),
} as const;
