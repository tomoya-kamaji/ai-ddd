import { describe, expect, it } from "vitest";
import { createSeasonUseCase } from "../../src/application/create-season";
import { updateSeasonUseCase } from "../../src/application/update-season";
import { createInMemoryRatingRepository } from "../../src/infrastructure/in-memory-rating-repository";
import { createInMemorySeasonRepository } from "../../src/infrastructure/in-memory-season-repository";
import {
  rating1600,
  rating1860,
  season2026,
  season2026Next,
  seasonName2026,
  seasonName2026Next,
} from "../fixtures";

const setup = () => {
  const seasonRepository = createInMemorySeasonRepository();
  const ratingRepository = createInMemoryRatingRepository();
  return {
    ratingRepository,
    create: createSeasonUseCase({ seasonRepository }),
    update: updateSeasonUseCase({ seasonRepository, ratingRepository }),
  };
};

describe("updateSeasonUseCase", () => {
  it("旧シーズンは残し、次シーズンへ寄せたレートを作る", async () => {
    const { ratingRepository, create, update } = setup();
    await create({ seasonId: season2026, name: seasonName2026 });
    await create({ seasonId: season2026Next, name: seasonName2026Next });
    await ratingRepository.insert(rating1860);
    await ratingRepository.insert(rating1600);

    const first = await update({
      seasonId: season2026,
      nextSeasonId: season2026Next,
    });
    const updated = first._unsafeUnwrap();
    expect(updated.season.kind).toBe("Updated");
    expect(updated.ratings.map((rating) => rating.value).sort()).toEqual([
      1600, 1750,
    ]);
    expect(updated.ratings.every((rating) => rating.seasonId === season2026Next)).toBe(
      true,
    );

    const previous = await ratingRepository.findBySeason(season2026);
    expect(previous.map((rating) => rating.value).sort()).toEqual([1600, 1860]);

    const second = await update({
      seasonId: season2026,
      nextSeasonId: season2026Next,
    });
    expect(second._unsafeUnwrapErr()).toEqual({
      kind: "SeasonNotPending",
      seasonId: season2026,
    });
  });

  it("無いシーズンは寄せない", async () => {
    const { update } = setup();
    const result = await update({
      seasonId: season2026,
      nextSeasonId: season2026Next,
    });
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "SeasonNotFound",
      seasonId: season2026,
    });
  });

  it("次シーズンが無いときは寄せない", async () => {
    const { create, update } = setup();
    await create({ seasonId: season2026, name: seasonName2026 });
    const result = await update({
      seasonId: season2026,
      nextSeasonId: season2026Next,
    });
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "NextSeasonInvalid",
      seasonId: season2026Next,
    });
  });
});
