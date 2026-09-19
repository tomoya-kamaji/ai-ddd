import type { Seminar, SeminarId } from "../domain/seminar/seminar";
import type { SeminarRepository } from "../domain/seminar/seminar-repository";

export const createInMemorySeminarRepository = (): SeminarRepository => {
  const store = new Map<SeminarId, Seminar>();
  return {
    insert: async (seminar) => {
      store.set(seminar.id, seminar);
    },
    findById: async (id) => store.get(id),
    findByTitle: async (title) =>
      [...store.values()].filter((s) => s.title === title),
    update: async (seminar) => {
      store.set(seminar.id, seminar);
    },
  };
};
