import { createSeasonUseCase } from "./application/create-season";
import { listRankingUseCase } from "./application/list-ranking";
import { recordMatchUseCase } from "./application/record-match";
import { startRatingUseCase } from "./application/start-rating";
import { updateSeasonUseCase } from "./application/update-season";
import { createInMemoryMatchHistoryRepository } from "./infrastructure/in-memory-match-history-repository";
import { createInMemoryRatingRepository } from "./infrastructure/in-memory-rating-repository";
import { createInMemorySeasonRepository } from "./infrastructure/in-memory-season-repository";

/** 依存を一箇所で組み立てる入口。DI コンテナではない。テストは使わず、ユースケースに deps を直接渡す。 */
export const createApp = () => {
  const ratingRepository = createInMemoryRatingRepository();
  const matchHistoryRepository = createInMemoryMatchHistoryRepository();
  const seasonRepository = createInMemorySeasonRepository();

  return {
    startRatingUseCase: startRatingUseCase({
      ratingRepository,
      seasonRepository,
    }),
    recordMatchUseCase: recordMatchUseCase({
      ratingRepository,
      matchHistoryRepository,
      seasonRepository,
    }),
    listRankingUseCase: listRankingUseCase({ ratingRepository }),
    createSeasonUseCase: createSeasonUseCase({ seasonRepository }),
    updateSeasonUseCase: updateSeasonUseCase({
      seasonRepository,
      ratingRepository,
    }),
  } as const;
};
