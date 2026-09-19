import type { Unrecorded } from "../src/domain/match-history/match";
import { MatchId } from "../src/domain/match-history/match";
import type { Rating } from "../src/domain/rating/rating";
import { PlayerId } from "../src/domain/rating/player";
import type { Pending } from "../src/domain/season/season";
import { SeasonId } from "../src/domain/season/season";

export const playerP001 = PlayerId.of("P001");
export const playerP002 = PlayerId.of("P002");
export const playerP010 = PlayerId.of("P010");
export const playerP011 = PlayerId.of("P011");
export const playerP012 = PlayerId.of("P012");
export const matchM001 = MatchId.of("M001");
export const season2026 = SeasonId.of("2026-1");
export const seasonName2026 = "2026年第1シーズン";
export const season2026Next = SeasonId.of("2026-2");
export const seasonName2026Next = "2026年第2シーズン";

export const rating1600 = {
  playerId: playerP001,
  craft: "Elf",
  seasonId: season2026,
  value: 1600,
} as const satisfies Rating;

export const rating1640P001 = {
  playerId: playerP001,
  craft: "Elf",
  seasonId: season2026,
  value: 1640,
} as const satisfies Rating;

export const rating1640P002 = {
  playerId: playerP002,
  craft: "Elf",
  seasonId: season2026,
  value: 1640,
} as const satisfies Rating;

export const rating1800 = {
  playerId: playerP010,
  craft: "Elf",
  seasonId: season2026,
  value: 1800,
} as const satisfies Rating;

export const rating1850 = {
  playerId: playerP011,
  craft: "Elf",
  seasonId: season2026,
  value: 1850,
} as const satisfies Rating;

export const rating1860 = {
  playerId: playerP010,
  craft: "Elf",
  seasonId: season2026,
  value: 1860,
} as const satisfies Rating;

export const unrecordedM001 = {
  kind: "Unrecorded",
  id: matchM001,
  seasonId: season2026,
  craft: "Elf",
  winnerId: playerP001,
  loserId: playerP002,
} as const satisfies Unrecorded;

export const pendingSeason = {
  kind: "Pending",
  id: season2026,
  name: seasonName2026,
} as const satisfies Pending;
