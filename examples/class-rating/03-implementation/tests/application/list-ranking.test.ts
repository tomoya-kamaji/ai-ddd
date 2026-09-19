import { describe, expect, it } from "vitest";
import { listRankingUseCase } from "../../src/application/list-ranking";
import { createInMemoryRatingRepository } from "../../src/infrastructure/in-memory-rating-repository";
import {
  playerP010,
  playerP011,
  playerP012,
  rating1860,
  season2026,
  season2026Next,
} from "../fixtures";

describe("listRankingUseCase", () => {
  it("開始済みがなければ空の一覧を返す", async () => {
    const run = listRankingUseCase({
      ratingRepository: createInMemoryRatingRepository(),
    });
    const result = await run({ craft: "Elf", seasonId: season2026 });
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("1850以上かつ1位は BEYOND。他シーズンは混ぜない", async () => {
    const ratingRepository = createInMemoryRatingRepository();
    await ratingRepository.insert(rating1860);
    await ratingRepository.insert({
      playerId: playerP011,
      craft: "Elf",
      seasonId: season2026,
      value: 1855,
    });
    await ratingRepository.insert({
      playerId: playerP012,
      craft: "Elf",
      seasonId: season2026,
      value: 1640,
    });
    await ratingRepository.insert({
      playerId: playerP012,
      craft: "Elf",
      seasonId: season2026Next,
      value: 1900,
    });
    const result = await listRankingUseCase({ ratingRepository })({
      craft: "Elf",
      seasonId: season2026,
    });
    const rows = result._unsafeUnwrap();
    expect(rows.map((row) => [row.rating.playerId, row.rank, row.grade])).toEqual([
      [playerP010, 1, "BEYOND"],
      [playerP011, 2, "BEYOND"],
      [playerP012, 3, "None"],
    ]);
  });
});
