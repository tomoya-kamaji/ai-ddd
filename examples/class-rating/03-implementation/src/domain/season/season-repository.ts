import type { Season, SeasonId } from "./season";

// 永続化のみ。業務操作（寄せ・更新済み）をここに生やさない
export type SeasonRepository = Readonly<{
  insert: (season: Season) => Promise<void>;
  findById: (id: SeasonId) => Promise<Season | undefined>;
  update: (season: Season) => Promise<void>;
}>;
