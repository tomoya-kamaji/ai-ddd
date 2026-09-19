import { err, ok, type Result } from "neverthrow";
import type { Rating } from "../domain/rating/rating";
import type { RatingRepository } from "../domain/rating/rating-repository";
import {
  Season,
  type CompleteSeasonError,
  type SeasonId,
  type Updated,
} from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";
import {
  requirePendingSeason,
  type SeasonNotFound,
  type SeasonNotPending,
} from "./require-pending-season";

type Deps = Readonly<{
  seasonRepository: SeasonRepository;
  ratingRepository: RatingRepository;
}>;

export type UpdateSeasonInput = Readonly<{
  seasonId: SeasonId;
  nextSeasonId: SeasonId;
}>;

export type NextSeasonInvalid = Readonly<{
  kind: "NextSeasonInvalid";
  seasonId: SeasonId;
}>;

export type NextSeasonOccupied = Readonly<{
  kind: "NextSeasonOccupied";
  seasonId: SeasonId;
}>;

export type UpdateSeasonError =
  | SeasonNotFound
  | SeasonNotPending
  | CompleteSeasonError
  | NextSeasonInvalid
  | NextSeasonOccupied;

export type UpdatedSeason = Readonly<{
  season: Updated;
  ratings: readonly Rating[];
}>;

/** 運営者がシーズンを閉じる。旧レートは残し、次シーズンへ寄せたレートを作る。 */
export const updateSeasonUseCase =
  (deps: Deps) =>
  async (
    input: UpdateSeasonInput,
  ): Promise<Result<UpdatedSeason, UpdateSeasonError>> => {
    if (input.seasonId === input.nextSeasonId) {
      return err({ kind: "NextSeasonInvalid", seasonId: input.nextSeasonId });
    }

    const current = await requirePendingSeason(
      deps.seasonRepository,
      input.seasonId,
    );
    if (current.isErr()) return err(current.error);

    const next = await requirePendingSeason(
      deps.seasonRepository,
      input.nextSeasonId,
    );
    if (next.isErr()) {
      return err(
        next.error.kind === "SeasonNotFound"
          ? { kind: "NextSeasonInvalid", seasonId: input.nextSeasonId }
          : next.error,
      );
    }

    const occupied = await deps.ratingRepository.findBySeason(
      input.nextSeasonId,
    );
    if (occupied.length > 0) {
      return err({ kind: "NextSeasonOccupied", seasonId: input.nextSeasonId });
    }

    const completed = Season.complete(current.value);
    if (completed.isErr()) return err(completed.error);

    const carried = (
      await deps.ratingRepository.findBySeason(input.seasonId)
    ).map((rating) => Season.compress(rating, input.nextSeasonId));
    for (const rating of carried) {
      await deps.ratingRepository.insert(rating);
    }
    await deps.seasonRepository.update(completed.value);

    return ok({
      season: completed.value,
      ratings: carried,
    });
  };
