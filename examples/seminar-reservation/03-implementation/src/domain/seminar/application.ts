import type { MemberId } from "./member";

declare const ApplicationIdBrand: unique symbol;
export type ApplicationId = string & { readonly [ApplicationIdBrand]: never };

export const ApplicationId = {
  // 生の文字列を ApplicationId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): ApplicationId => value as ApplicationId,
} as const;

export type Applied = Readonly<{
  kind: "Applied";
  id: ApplicationId;
  memberId: MemberId;
  appliedAt: Date;
}>;

export type Cancelled = Readonly<{
  kind: "Cancelled";
  id: ApplicationId;
  memberId: MemberId;
  appliedAt: Date;
  cancelledAt: Date;
}>;

export type Application = Applied | Cancelled;

export const Application = {
  // R5: 必ず Applied で生成される（他の状態で作る関数は存在しない）
  create: (id: ApplicationId, memberId: MemberId, now: Date): Applied => ({
    kind: "Applied",
    id,
    memberId,
    appliedAt: now,
  }),

  // R6: 引数型が Applied なので Cancelled を渡すとコンパイルエラー
  cancel: (applied: Applied, now: Date): Cancelled => ({
    kind: "Cancelled",
    id: applied.id,
    memberId: applied.memberId,
    appliedAt: applied.appliedAt,
    cancelledAt: now,
  }),

  isApplied: (application: Application) => application.kind === "Applied",
} as const;
