import type { Seminar, SeminarId } from "./seminar";

// 永続化のみ。業務操作（申込・キャンセル等）をここに生やさない。集約をまるごと保存・取得する
export type SeminarRepository = Readonly<{
  insert: (seminar: Seminar) => Promise<void>;
  findById: (id: SeminarId) => Promise<Seminar | undefined>;
  findByTitle: (title: string) => Promise<readonly Seminar[]>;
  update: (seminar: Seminar) => Promise<void>;
}>;
