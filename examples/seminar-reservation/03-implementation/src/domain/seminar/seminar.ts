import { err, ok, type Result } from "neverthrow";
import type { MemberId } from "./member";
import { Capacity, type CapacityError } from "./capacity";
import { Application, type ApplicationId } from "./application";

declare const SeminarIdBrand: unique symbol;
export type SeminarId = string & { readonly [SeminarIdBrand]: never };

export const SeminarId = {
  // 生の文字列を SeminarId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): SeminarId => value as SeminarId,
} as const;

// 集約ルート。Application の追加・状態変更は必ずこのファイルの関数経由で行う
export type Seminar = Readonly<{
  id: SeminarId;
  title: string;
  startAt: Date;
  capacity: Capacity;
  applications: readonly Application[];
}>;

export type CreateSeminarError =
  | CapacityError
  | Readonly<{ kind: "StartAtMustBeFuture"; startAt: Date }>;

export type ApplyError =
  | Readonly<{ kind: "SeminarIsFull"; seminarId: SeminarId }>
  | Readonly<{ kind: "AlreadyApplied"; seminarId: SeminarId; memberId: MemberId }>;

export type CancelApplicationError =
  | Readonly<{ kind: "ApplicationNotFound"; applicationId: ApplicationId }>
  | Readonly<{ kind: "AlreadyCancelled"; applicationId: ApplicationId }>
  | Readonly<{
      kind: "CancellationDeadlinePassed";
      applicationId: ApplicationId;
      deadline: Date;
    }>;

const CANCEL_DEADLINE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const Seminar = {
  create: (
    input: Readonly<{
      id: SeminarId;
      title: string;
      startAt: Date;
      capacity: number;
    }>,
    now: Date,
  ): Result<Seminar, CreateSeminarError> => {
    const capacity = Capacity.create(input.capacity);
    if (capacity.isErr()) return err(capacity.error);

    if (input.startAt.getTime() <= now.getTime()) {
      return err({ kind: "StartAtMustBeFuture", startAt: input.startAt });
    }

    return ok({
      id: input.id,
      title: input.title,
      startAt: input.startAt,
      capacity: capacity.value,
      applications: [],
    });
  },

  // R1 判定: 申込済(Applied)の件数が定員以上。Cancelled は数えない
  isFull: (seminar: Seminar): boolean =>
    seminar.applications.filter(Application.isApplied).length >=
    seminar.capacity.value,

  // R2 判定: 同一会員の Applied が存在する。Cancelled は数えない（再申込可）
  hasAppliedMember: (seminar: Seminar, memberId: MemberId): boolean =>
    seminar.applications.some(
      (a) => Application.isApplied(a) && a.memberId === memberId,
    ),

  // R3: 開催日時の3日前がキャンセル期限。期限ちょうどまでキャンセル可、1msでも過ぎたら不可
  cancellationDeadline: (seminar: Seminar): Date =>
    new Date(seminar.startAt.getTime() - CANCEL_DEADLINE_DAYS * MS_PER_DAY),

  isCancellable: (seminar: Seminar, now: Date): boolean =>
    now.getTime() <= Seminar.cancellationDeadline(seminar).getTime(),

  // UC1。重複申込のユーザーに「満員」と返すと誤解を招くため、重複判定を先に行う
  apply: (
    seminar: Seminar,
    applicationId: ApplicationId,
    memberId: MemberId,
    now: Date,
  ): Result<Seminar, ApplyError> => {
    if (Seminar.hasAppliedMember(seminar, memberId)) {
      return err({ kind: "AlreadyApplied", seminarId: seminar.id, memberId });
    }
    if (Seminar.isFull(seminar)) {
      return err({ kind: "SeminarIsFull", seminarId: seminar.id });
    }
    return ok({
      ...seminar,
      applications: [
        ...seminar.applications,
        Application.create(applicationId, memberId, now),
      ],
    });
  },

  // UC2
  cancelApplication: (
    seminar: Seminar,
    applicationId: ApplicationId,
    now: Date,
  ): Result<Seminar, CancelApplicationError> => {
    const target = seminar.applications.find((a) => a.id === applicationId);
    if (target === undefined) {
      return err({ kind: "ApplicationNotFound", applicationId });
    }
    if (target.kind === "Cancelled") {
      return err({ kind: "AlreadyCancelled", applicationId });
    }
    if (!Seminar.isCancellable(seminar, now)) {
      return err({
        kind: "CancellationDeadlinePassed",
        applicationId,
        deadline: Seminar.cancellationDeadline(seminar),
      });
    }
    return ok({
      ...seminar,
      applications: seminar.applications.map((a) =>
        a.id === applicationId ? Application.cancel(target, now) : a,
      ),
    });
  },
} as const;
