import { describe, expect, it } from "vitest";
import { fitWithin } from "./photo-client";

describe("fitWithin", () => {
  it("scales the long side down to the limit, keeping proportions", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("does not upscale small images", () => {
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(10000, 1, 2048)).toEqual({ width: 2048, height: 1 });
  });
});
