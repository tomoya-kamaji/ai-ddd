import type { Season, SeasonId } from "../domain/season/season";
import type { SeasonRepository } from "../domain/season/season-repository";

export const createInMemorySeasonRepository = (): SeasonRepository => {
  const store = new Map<SeasonId, Season>();
  return {
    insert: async (season) => {
      store.set(season.id, season);
    },
    findById: async (id) => store.get(id),
    update: async (season) => {
      store.set(season.id, season);
    },
  };
};
