import { err, ok, type Result } from "neverthrow";
import type { Craft } from "../domain/rating/craft";
import {
  Match,
  type CreateMatchError,
  type MatchId,
} from "../domain/match-history/match";
import {
  MatchHistory,
  type RecordMatchError,
} from "../domain/match-history/match-history";
import type { MatchHistoryRepository } from "../domain/match-history/match-history-repository";
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
  matchHistoryRepository: MatchHistoryRepository;
  seasonRepository: SeasonRepository;
}>;

export type RecordMatchInput = Readonly<{
  matchId: MatchId;
  seasonId: SeasonId;
  craft: Craft;
  winnerId: PlayerId;
  loserId: PlayerId;
}>;

export type RatingNotStarted = Readonly<{
  kind: "RatingNotStarted";
  playerId: PlayerId;
  craft: Craft;
  seasonId: SeasonId;
}>;

export type RecordMatchUseCaseError =
  | CreateMatchError
  | RecordMatchError
  | RatingNotStarted
  | SeasonNotFound
  | SeasonNotPending;

export type RecordedMatch = Readonly<{
  winner: Rating;
  loser: Rating;
  history: MatchHistory;
}>;

const findStarted = async (
  repo: RatingRepository,
  playerId: PlayerId,
  craft: Craft,
  seasonId: SeasonId,
): Promise<Result<Rating, RatingNotStarted>> => {
  const rating = await repo.findByPlayerCraftSeason(playerId, craft, seasonId);
  return rating === undefined
    ? err({ kind: "RatingNotStarted", playerId, craft, seasonId })
    : ok(rating);
};

/** プレイヤーが対局結果を記録する。両者のレートを同時に更新し、同じ対局は一度だけ集計する。 */
export const recordMatchUseCase =
  (deps: Deps) =>
  async (
    input: RecordMatchInput,
  ): Promise<Result<RecordedMatch, RecordMatchUseCaseError>> => {
    const season = await requirePendingSeason(
      deps.seasonRepository,
      input.seasonId,
    );
    if (season.isErr()) return err(season.error);

    const created = Match.create(
      input.matchId,
      input.seasonId,
      input.craft,
      input.winnerId,
      input.loserId,
    );
    if (created.isErr()) return err(created.error);

    const winner = await findStarted(
      deps.ratingRepository,
      input.winnerId,
      input.craft,
      input.seasonId,
    );
    if (winner.isErr()) return err(winner.error);

    const loser = await findStarted(
      deps.ratingRepository,
      input.loserId,
      input.craft,
      input.seasonId,
    );
    if (loser.isErr()) return err(loser.error);

    const existingHistory = await deps.matchHistoryRepository.find();
    const current = existingHistory ?? MatchHistory.empty();
    const recorded = MatchHistory.record(current, created.value);
    if (recorded.isErr()) return err(recorded.error);

    const nextWinner = Rating.apply(winner.value, loser.value, "win");
    const nextLoser = Rating.apply(loser.value, winner.value, "lose");

    await deps.ratingRepository.update(nextWinner);
    await deps.ratingRepository.update(nextLoser);
    if (existingHistory === undefined) {
      await deps.matchHistoryRepository.insert(recorded.value);
    } else {
      await deps.matchHistoryRepository.update(recorded.value);
    }

    return ok({
      winner: nextWinner,
      loser: nextLoser,
      history: recorded.value,
    });
  };
