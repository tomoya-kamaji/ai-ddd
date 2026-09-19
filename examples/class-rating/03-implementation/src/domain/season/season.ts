import { err, ok, type Result } from "neverthrow";
import type { Rating } from "../rating/rating";

declare const SeasonIdBrand: unique symbol;
export type SeasonId = string & { readonly [SeasonIdBrand]: never };

export const SeasonId = {
  // 生の文字列を SeasonId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): SeasonId => value as SeasonId,
} as const;

export type Pending = Readonly<{
  kind: "Pending";
  id: SeasonId;
  name: string;
}>;

export type Updated = Readonly<{
  kind: "Updated";
  id: SeasonId;
  name: string;
}>;

export type Season = Pending | Updated;

export type CompleteSeasonError = Readonly<{
  kind: "AlreadyUpdated";
  seasonId: SeasonId;
}>;

const compressValue = (value: number): number => {
  if (value >= 1850) return 1750;
  if (value >= 1750) return 1650;
  if (value >= 1600) return 1600;
  if (value >= 1550) return 1550;
  if (value >= 1520) return 1520;
  if (value >= 1480) return 1500;
  return value;
};

export const Season = {
  create: (id: SeasonId, name: string): Pending => ({
    kind: "Pending",
    id,
    name,
  }),

  // R6: 引数型が Pending なので Updated を渡すとコンパイルエラー
  markUpdated: (season: Pending): Updated => ({
    kind: "Updated",
    id: season.id,
    name: season.name,
  }),

  // R6: 集約経由では Updated を実行時に拒否する
  complete: (season: Season): Result<Updated, CompleteSeasonError> =>
    season.kind === "Updated"
      ? err({ kind: "AlreadyUpdated", seasonId: season.id })
      : ok(Season.markUpdated(season)),

  // R6: 旧シーズンは残す。次シーズンの Rating を1件だけ返す（一括はユースケース）
  compress: (rating: Rating, nextSeasonId: SeasonId): Rating => ({
    playerId: rating.playerId,
    craft: rating.craft,
    seasonId: nextSeasonId,
    value: compressValue(rating.value),
  }),
} as const;
