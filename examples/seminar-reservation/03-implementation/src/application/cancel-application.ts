import { err, type Result } from "neverthrow";
import type { ApplicationId } from "../domain/seminar/application";
import {
  Seminar,
  type CancelApplicationError,
  type SeminarId,
} from "../domain/seminar/seminar";
import type { SeminarRepository } from "../domain/seminar/seminar-repository";

type Deps = Readonly<{
  seminarRepository: SeminarRepository;
}>;

export type CancelApplicationInput = Readonly<{
  seminarId: SeminarId;
  applicationId: ApplicationId;
}>;

export type CancelApplicationUseCaseError =
  | Readonly<{ kind: "SeminarNotFound"; seminarId: SeminarId }>
  | CancelApplicationError;

export const cancelApplication =
  (deps: Deps) =>
  async (
    input: CancelApplicationInput,
    now: Date,
  ): Promise<Result<Seminar, CancelApplicationUseCaseError>> => {
    const seminar = await deps.seminarRepository.findById(input.seminarId);
    if (seminar === undefined) {
      return err({ kind: "SeminarNotFound", seminarId: input.seminarId });
    }
    const cancelled = Seminar.cancelApplication(seminar, input.applicationId, now);
    if (cancelled.isErr()) return cancelled;
    await deps.seminarRepository.update(cancelled.value);
    return cancelled;
  };
