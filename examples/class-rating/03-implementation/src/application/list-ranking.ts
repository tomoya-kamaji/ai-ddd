import { ok, type Result } from "neverthrow";
import type { Craft } from "../domain/rating/craft";
import { Rating, type RankedRating } from "../domain/rating/rating";
import type { RatingRepository } from "../domain/rating/rating-repository";
import type { SeasonId } from "../domain/season/season";

type Deps = Readonly<{
  ratingRepository: RatingRepository;
}>;

export type ListRankingInput = Readonly<{
  craft: Craft;
  seasonId: SeasonId;
}>;

/** プレイヤーが指定シーズン・クラスのランキングを見る。各行にレートと肩書きが付く。 */
export const listRankingUseCase =
  (deps: Deps) =>
  async (
    input: ListRankingInput,
  ): Promise<Result<readonly RankedRating[], never>> => {
    const ratings = await deps.ratingRepository.findByCraftInSeason(
      input.craft,
      input.seasonId,
    );
    return ok(Rating.rank(ratings));
  };
