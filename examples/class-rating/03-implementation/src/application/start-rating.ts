import { err, ok, type Result } from "neverthrow";
import type { Craft } from "../domain/rating/craft";
import type { PlayerId } from "../domain/rating/player";
import { Rating } from "../domain/rating/rating";
import type { RatingRepository } from "../domain/rating/rating-repository";
import type { SeasonId } from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";
import {
  requirePendingSeason,
  type SeasonNotFound,
  type SeasonNotPending,
} from "./require-pending-season";

type Deps = Readonly<{
  ratingRepository: RatingRepository;
  seasonRepository: SeasonRepository;
}>;

export type StartRatingInput = Readonly<{
  playerId: PlayerId;
  craft: Craft;
  seasonId: SeasonId;
}>;

export type AlreadyStarted = Readonly<{
  kind: "AlreadyStarted";
  playerId: PlayerId;
  craft: Craft;
  seasonId: SeasonId;
}>;

export type StartRatingError =
  | AlreadyStarted
  | SeasonNotFound
  | SeasonNotPending;

/** プレイヤーがクラスのレートを開始する。未更新シーズンでのみ。同じ識別子は再度開始できない。 */
export const startRatingUseCase =
  (deps: Deps) =>
  async (input: StartRatingInput): Promise<Result<Rating, StartRatingError>> => {
    const season = await requirePendingSeason(
      deps.seasonRepository,
      input.seasonId,
    );
    if (season.isErr()) return err(season.error);

    const existing = await deps.ratingRepository.findByPlayerCraftSeason(
      input.playerId,
      input.craft,
      input.seasonId,
    );
    if (existing !== undefined) {
      return err({
        kind: "AlreadyStarted",
        playerId: input.playerId,
        craft: input.craft,
        seasonId: input.seasonId,
      });
    }
    const started = Rating.start(input.playerId, input.craft, input.seasonId);
    await deps.ratingRepository.insert(started);
    return ok(started);
  };
