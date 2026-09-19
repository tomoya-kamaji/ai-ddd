import { describe, expect, it } from "vitest";
import { createSeasonUseCase } from "../../src/application/create-season";
import { startRatingUseCase } from "../../src/application/start-rating";
import { createInMemoryRatingRepository } from "../../src/infrastructure/in-memory-rating-repository";
import { createInMemorySeasonRepository } from "../../src/infrastructure/in-memory-season-repository";
import {
  playerP001,
  rating1600,
  season2026,
  seasonName2026,
} from "../fixtures";

const setup = () => {
  const ratingRepository = createInMemoryRatingRepository();
  const seasonRepository = createInMemorySeasonRepository();
  return {
    createSeason: createSeasonUseCase({ seasonRepository }),
    run: startRatingUseCase({ ratingRepository, seasonRepository }),
  };
};

describe("startRatingUseCase", () => {
  it("未開始なら 1600 で開始する", async () => {
    const { createSeason, run } = setup();
    await createSeason({ seasonId: season2026, name: seasonName2026 });
    const result = await run({
      playerId: playerP001,
      craft: "Elf",
      seasonId: season2026,
    });
    expect(result._unsafeUnwrap()).toEqual(rating1600);
  });

  it("開始済みなら何も作らない", async () => {
    const { createSeason, run } = setup();
    await createSeason({ seasonId: season2026, name: seasonName2026 });
    await run({ playerId: playerP001, craft: "Elf", seasonId: season2026 });
    const result = await run({
      playerId: playerP001,
      craft: "Elf",
      seasonId: season2026,
    });
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "AlreadyStarted",
      playerId: playerP001,
      craft: "Elf",
      seasonId: season2026,
    });
  });
});
