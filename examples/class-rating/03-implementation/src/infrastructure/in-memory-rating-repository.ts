import type { SeasonId } from "../domain/season/season";
import type { Craft } from "../domain/rating/craft";
import type { PlayerId } from "../domain/rating/player";
import type { Rating } from "../domain/rating/rating";
import type { RatingRepository } from "../domain/rating/rating-repository";

const keyOf = (playerId: PlayerId, craft: Craft, seasonId: SeasonId) =>
  `${playerId}:${craft}:${seasonId}`;

export const createInMemoryRatingRepository = (): RatingRepository => {
  const store = new Map<string, Rating>();
  return {
    insert: async (rating) => {
      store.set(keyOf(rating.playerId, rating.craft, rating.seasonId), rating);
    },
    findByPlayerCraftSeason: async (playerId, craft, seasonId) =>
      store.get(keyOf(playerId, craft, seasonId)),
    findByCraftInSeason: async (craft, seasonId) =>
      [...store.values()].filter(
        (rating) => rating.craft === craft && rating.seasonId === seasonId,
      ),
    findBySeason: async (seasonId) =>
      [...store.values()].filter((rating) => rating.seasonId === seasonId),
    update: async (rating) => {
      store.set(keyOf(rating.playerId, rating.craft, rating.seasonId), rating);
    },
  };
};
