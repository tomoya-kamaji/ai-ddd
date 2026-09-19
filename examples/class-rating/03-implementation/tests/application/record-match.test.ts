import { describe, expect, it } from "vitest";
import { createSeasonUseCase } from "../../src/application/create-season";
import { recordMatchUseCase } from "../../src/application/record-match";
import { startRatingUseCase } from "../../src/application/start-rating";
import { MatchId } from "../../src/domain/match-history/match";
import { createInMemoryMatchHistoryRepository } from "../../src/infrastructure/in-memory-match-history-repository";
import { createInMemoryRatingRepository } from "../../src/infrastructure/in-memory-rating-repository";
import { createInMemorySeasonRepository } from "../../src/infrastructure/in-memory-season-repository";
import {
  matchM001,
  playerP001,
  playerP002,
  season2026,
  seasonName2026,
} from "../fixtures";

const setup = () => {
  const ratingRepository = createInMemoryRatingRepository();
  const matchHistoryRepository = createInMemoryMatchHistoryRepository();
  const seasonRepository = createInMemorySeasonRepository();
  return {
    createSeason: createSeasonUseCase({ seasonRepository }),
    start: startRatingUseCase({ ratingRepository, seasonRepository }),
    record: recordMatchUseCase({
      ratingRepository,
      matchHistoryRepository,
      seasonRepository,
    }),
  };
};

describe("recordMatchUseCase", () => {
  it("両者を同時に更新し、対局を一度だけ残す", async () => {
    const { createSeason, start, record } = setup();
    await createSeason({ seasonId: season2026, name: seasonName2026 });
    await start({ playerId: playerP001, craft: "Elf", seasonId: season2026 });
    await start({ playerId: playerP002, craft: "Elf", seasonId: season2026 });

    const first = await record({
      matchId: matchM001,
      seasonId: season2026,
      craft: "Elf",
      winnerId: playerP001,
      loserId: playerP002,
    });
    const recorded = first._unsafeUnwrap();
    expect(recorded.winner.value).toBe(1616);
    expect(recorded.loser.value).toBe(1584);
    expect(recorded.winner.seasonId).toBe(season2026);
    expect(recorded.history.matches).toHaveLength(1);

    const second = await record({
      matchId: matchM001,
      seasonId: season2026,
      craft: "Elf",
      winnerId: playerP001,
      loserId: playerP002,
    });
    expect(second._unsafeUnwrapErr()).toEqual({
      kind: "AlreadyRecorded",
      matchId: matchM001,
    });
  });

  it("未開始のクラスでは集計しない", async () => {
    const { createSeason, start, record } = setup();
    await createSeason({ seasonId: season2026, name: seasonName2026 });
    await start({ playerId: playerP001, craft: "Elf", seasonId: season2026 });
    const result = await record({
      matchId: matchM001,
      seasonId: season2026,
      craft: "Elf",
      winnerId: playerP001,
      loserId: playerP002,
    });
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "RatingNotStarted",
      playerId: playerP002,
      craft: "Elf",
      seasonId: season2026,
    });
  });

  it("勝者と同じ敗者は記録しない", async () => {
    const { createSeason, record } = setup();
    await createSeason({ seasonId: season2026, name: seasonName2026 });
    const result = await record({
      matchId: MatchId.of("M002"),
      seasonId: season2026,
      craft: "Elf",
      winnerId: playerP001,
      loserId: playerP001,
    });
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "WinnerEqualsLoser",
      playerId: playerP001,
    });
  });
});
