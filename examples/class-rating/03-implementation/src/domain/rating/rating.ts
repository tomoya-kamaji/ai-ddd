import type { SeasonId } from "../season/season";
import type { Craft } from "./craft";
import { Grade } from "./grade";
import type { PlayerId } from "./player";

export type Rating = Readonly<{
  playerId: PlayerId;
  craft: Craft;
  seasonId: SeasonId;
  value: number;
}>;

export type Outcome = "win" | "lose";

export type RankedRating = Readonly<{
  rating: Rating;
  rank: number;
  grade: Grade;
}>;

const K = 32;
const SCALE = 400;
const INITIAL_VALUE = 1600;

const expectedScore = (me: number, opponent: number): number =>
  1 / (1 + 10 ** ((opponent - me) / SCALE));

const delta = (me: number, opponent: number, outcome: Outcome): number => {
  const score = outcome === "win" ? 1 : 0;
  return Math.round(K * (score - expectedScore(me, opponent)));
};

export const Rating = {
  // R2 / 開始値: 未開始の Rating は作らない。この関数だけが生成する
  start: (playerId: PlayerId, craft: Craft, seasonId: SeasonId): Rating => ({
    playerId,
    craft,
    seasonId,
    value: INITIAL_VALUE,
  }),

  // 相手との差で自分の value を変える。1件だけ返す（R4 の同時更新はユースケース）
  apply: (rating: Rating, opponent: Rating, outcome: Outcome): Rating => ({
    playerId: rating.playerId,
    craft: rating.craft,
    seasonId: rating.seasonId,
    value: rating.value + delta(rating.value, opponent.value, outcome),
  }),

  grade: (rating: Rating) => Grade.of(rating.value),

  // R5: 同じ Craft の開始済みを value の大きい順に並べ、順位と肩書きを付ける
  rank: (ratings: readonly Rating[]): readonly RankedRating[] =>
    [...ratings]
      .sort((a, b) => b.value - a.value)
      .map((rating, index) => {
        const rank = index + 1;
        return {
          rating,
          rank,
          grade: Grade.ofRanked(rating.value, rank),
        };
      }),
} as const;
