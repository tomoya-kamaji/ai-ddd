import { err, type Result } from "neverthrow";
import { ApplicationId } from "../domain/seminar/application";
import type { MemberId } from "../domain/seminar/member";
import {
  Seminar,
  type ApplyError,
  type SeminarId,
} from "../domain/seminar/seminar";
import type { SeminarRepository } from "../domain/seminar/seminar-repository";

type Deps = Readonly<{
  seminarRepository: SeminarRepository;
  generateId: () => string;
}>;

export type ApplyToSeminarInput = Readonly<{
  seminarId: SeminarId;
  memberId: MemberId;
}>;

export type ApplyToSeminarError =
  | Readonly<{ kind: "SeminarNotFound"; seminarId: SeminarId }>
  | ApplyError;

export const applyToSeminar =
  (deps: Deps) =>
  async (
    input: ApplyToSeminarInput,
    now: Date,
  ): Promise<Result<Seminar, ApplyToSeminarError>> => {
    const seminar = await deps.seminarRepository.findById(input.seminarId);
    if (seminar === undefined) {
      return err({ kind: "SeminarNotFound", seminarId: input.seminarId });
    }
    const applied = Seminar.apply(
      seminar,
      ApplicationId.of(deps.generateId()),
      input.memberId,
      now,
    );
    if (applied.isErr()) return applied;
    await deps.seminarRepository.update(applied.value);
    return applied;
  };
