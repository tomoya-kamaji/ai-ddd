import { err, ok, type Result } from "neverthrow";
import type { Pending, SeasonId } from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";
import { assertNever } from "../shared/assert-never";

export type SeasonNotFound = Readonly<{
  kind: "SeasonNotFound";
  seasonId: SeasonId;
}>;

export type SeasonNotPending = Readonly<{
  kind: "SeasonNotPending";
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
  switch (season.kind) {
    case "Pending":
      return ok(season);
    case "Updated":
      return err({ kind: "SeasonNotPending", seasonId });
    default:
      return assertNever(season);
  }
};
