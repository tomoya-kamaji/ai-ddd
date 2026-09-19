import { describe, expect, it } from "vitest";
import { Craft } from "../../src/domain/rating/craft";

describe("Craft.parse", () => {
  it("採用している7クラスを返す", () => {
    const parsed = Craft.all.map((craft) => Craft.parse(craft));
    expect(parsed.every((r) => r.isOk())).toBe(true);
    expect(parsed.map((r) => r._unsafeUnwrap())).toEqual([...Craft.all]);
  });

  it("ニュートラルはクラスではない", () => {
    const result = Craft.parse("Neutral");
    expect(result._unsafeUnwrapErr()).toEqual({
      kind: "UnknownCraft",
      value: "Neutral",
    });
  });
});
