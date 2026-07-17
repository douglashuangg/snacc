import { describe, expect, it } from "vitest";

import { calculateOverallScore } from "./scoring";

describe("calculateOverallScore", () => {
  it("uses the documented weights", () => {
    expect(
      calculateOverallScore({
        taste: 10,
        texture: 8,
        value: 6,
        packaging: 4,
        buy_again: 2,
      }),
    ).toBe(7.4);
  });

  it("returns one-decimal bounds", () => {
    expect(
      calculateOverallScore({
        taste: 1,
        texture: 1,
        value: 1,
        packaging: 1,
        buy_again: 1,
      }),
    ).toBe(1);
  });
});
