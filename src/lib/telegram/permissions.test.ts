import { describe, expect, it } from "vitest";
import { isAdmin, parseAdminIds } from "./permissions";

describe("parseAdminIds", () => {
  it("parses a comma-separated list with spaces", () => {
    expect([...parseAdminIds(" 111, 222 ,333")]).toEqual([111, 222, 333]);
  });

  it("skips junk, empty and non-positive entries", () => {
    expect([...parseAdminIds("abc,,0,-5,12x,444")]).toEqual([444]);
  });

  it("returns an empty set for unset env", () => {
    expect(parseAdminIds(undefined).size).toBe(0);
    expect(parseAdminIds("").size).toBe(0);
  });
});

describe("isAdmin", () => {
  it("allows listed ids only", () => {
    expect(isAdmin(111, "111,222")).toBe(true);
    expect(isAdmin(333, "111,222")).toBe(false);
  });

  it("denies everyone when the list is empty or user is unknown", () => {
    expect(isAdmin(111, undefined)).toBe(false);
    expect(isAdmin(undefined, "111")).toBe(false);
  });
});
