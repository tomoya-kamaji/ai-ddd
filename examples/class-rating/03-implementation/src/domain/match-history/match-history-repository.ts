import type { MatchHistory } from "./match-history";

// 永続化のみ。履歴は1つ。業務操作（record）をここに生やさない
export type MatchHistoryRepository = Readonly<{
  insert: (history: MatchHistory) => Promise<void>;
  find: () => Promise<MatchHistory | undefined>;
  update: (history: MatchHistory) => Promise<void>;
}>;
