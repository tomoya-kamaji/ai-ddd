import { err, ok, type Result } from "neverthrow";

export type Capacity = Readonly<{ value: number }>;

export type CapacityError = Readonly<{
  kind: "CapacityMustBePositive";
  value: number;
}>;

export const Capacity = {
  // R4: 定員は1以上の整数
  create: (value: number): Result<Capacity, CapacityError> =>
    Number.isInteger(value) && value >= 1
      ? ok({ value })
      : err({ kind: "CapacityMustBePositive", value }),
} as const;
