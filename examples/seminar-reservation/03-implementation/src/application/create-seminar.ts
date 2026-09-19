import type { Result } from "neverthrow";
import {
  Seminar,
  SeminarId,
  type CreateSeminarError,
} from "../domain/seminar/seminar";
import type { SeminarRepository } from "../domain/seminar/seminar-repository";

type Deps = Readonly<{
  seminarRepository: SeminarRepository;
  generateId: () => string;
}>;

export type CreateSeminarInput = Readonly<{
  title: string;
  startAt: Date;
  capacity: number;
}>;

export type CreateSeminarUseCaseError = CreateSeminarError;

export const createSeminar =
  (deps: Deps) =>
  async (
    input: CreateSeminarInput,
    now: Date,
  ): Promise<Result<Seminar, CreateSeminarUseCaseError>> => {
    const created = Seminar.create(
      { id: SeminarId.of(deps.generateId()), ...input },
      now,
    );
    if (created.isErr()) return created;
    await deps.seminarRepository.insert(created.value);
    return created;
  };
