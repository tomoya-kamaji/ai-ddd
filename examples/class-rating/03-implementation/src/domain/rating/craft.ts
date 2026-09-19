import { err, ok, type Result } from "neverthrow";

const CRAFTS = [
  "Elf",
  "Royal",
  "Witch",
  "Dragon",
  "Nightmare",
  "Bishop",
  "Nemesis",
] as const;

export type Craft = (typeof CRAFTS)[number];

export type UnknownCraft = Readonly<{ kind: "UnknownCraft"; value: string }>;

export const Craft = {
  all: CRAFTS,

  isCraft: (value: string) => CRAFTS.some((craft) => craft === value),

  parse: (value: string): Result<Craft, UnknownCraft> => {
    const found = CRAFTS.find((craft) => craft === value);
    return found !== undefined
      ? ok(found)
      : err({ kind: "UnknownCraft", value });
  },
} as const;
