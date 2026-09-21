import { err, type Result } from "neverthrow";
import {
  Season,
  type Pending,
  type SeasonId,
  type SeasonNotPending,
} from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";

export type { SeasonNotPending } from "../domain/season/season";

export type SeasonNotFound = Readonly<{
  kind: "SeasonNotFound";
  seasonId: SeasonId;
}>;

export const requirePendingSeason = async (
  seasonRepository: SeasonRepository,
  seasonId: SeasonId,
): Promise<Result<Pending, SeasonNotFound | SeasonNotPending>> => {
  const season = await seasonRepository.findById(seasonId);
  if (season === undefined) {
    return err({ kind: "SeasonNotFound", seasonId });
  }
  return Season.requirePending(season);
};
