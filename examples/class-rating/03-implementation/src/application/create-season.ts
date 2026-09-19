import { err, ok, type Result } from "neverthrow";
import { Season, type Pending, type SeasonId } from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";

type Deps = Readonly<{
  seasonRepository: SeasonRepository;
}>;

export type CreateSeasonInput = Readonly<{
  seasonId: SeasonId;
  name: string;
}>;

export type CreateSeasonError = Readonly<{
  kind: "SeasonAlreadyExists";
  seasonId: SeasonId;
}>;

/** 運営者がシーズンを開く。同じシーズンは一度だけ作れる。 */
export const createSeasonUseCase =
  (deps: Deps) =>
  async (
    input: CreateSeasonInput,
  ): Promise<Result<Pending, CreateSeasonError>> => {
    const existing = await deps.seasonRepository.findById(input.seasonId);
    if (existing !== undefined) {
      return err({ kind: "SeasonAlreadyExists", seasonId: input.seasonId });
    }
    const created = Season.create(input.seasonId, input.name);
    await deps.seasonRepository.insert(created);
    return ok(created);
  };
