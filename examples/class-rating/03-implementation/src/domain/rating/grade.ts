export type Grade = "None" | "EPIC" | "ULTIMATE" | "LEGEND" | "BEYOND";

const ofValue = (value: number): Exclude<Grade, "BEYOND"> => {
  if (value >= 1850) return "LEGEND";
  if (value >= 1750) return "ULTIMATE";
  if (value >= 1650) return "EPIC";
  return "None";
};

export const Grade = {
  of: (value: number): Exclude<Grade, "BEYOND"> => ofValue(value),

  ofRanked: (value: number, rank: number): Grade =>
    value >= 1850 && rank >= 1 && rank <= 100 ? "BEYOND" : ofValue(value),
} as const;
