import type { MatchHistory } from "../domain/match-history/match-history";
import type { MatchHistoryRepository } from "../domain/match-history/match-history-repository";

export const createInMemoryMatchHistoryRepository = (): MatchHistoryRepository => {
  let current: MatchHistory | undefined;
  return {
    insert: async (history) => {
      current = history;
    },
    find: async () => current,
    update: async (history) => {
      current = history;
    },
  };
};
