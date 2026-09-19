import type { SeasonId } from "../season/season";
import type { Craft } from "./craft";
import type { PlayerId } from "./player";
import type { Rating } from "./rating";

// 永続化のみ。業務操作（開始・集計・寄せ）をここに生やさない。集約をまるごと保存・取得する
export type RatingRepository = Readonly<{
  insert: (rating: Rating) => Promise<void>;
  findByPlayerCraftSeason: (
    playerId: PlayerId,
    craft: Craft,
    seasonId: SeasonId,
  ) => Promise<Rating | undefined>;
  findByCraftInSeason: (
    craft: Craft,
    seasonId: SeasonId,
  ) => Promise<readonly Rating[]>;
  findBySeason: (seasonId: SeasonId) => Promise<readonly Rating[]>;
  update: (rating: Rating) => Promise<void>;
}>;
