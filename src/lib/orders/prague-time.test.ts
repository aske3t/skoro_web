import { describe, expect, it } from "vitest";
import { formatPragueDateTime, parsePragueLocal, pragueMinuteOfDay } from "./prague-time";

describe("parsePragueLocal", () => {
  it("applies the winter and summer offsets", () => {
    expect(parsePragueLocal("2026-01-15T12:00")?.toISOString()).toBe("2026-01-15T11:00:00.000Z");
    expect(parsePragueLocal("2026-07-15T12:00")?.toISOString()).toBe("2026-07-15T10:00:00.000Z");
  });

  it("accepts seconds", () => {
    expect(parsePragueLocal("2026-07-15T12:00:30")?.toISOString()).toBe("2026-07-15T10:00:30.000Z");
  });

  describe("spring forward, 2026-03-29", () => {
    it("handles the times around the jump", () => {
      expect(parsePragueLocal("2026-03-29T01:59")?.toISOString()).toBe("2026-03-29T00:59:00.000Z");
      expect(parsePragueLocal("2026-03-29T03:00")?.toISOString()).toBe("2026-03-29T01:00:00.000Z");
    });

    it("rejects a time that does not exist", () => {
      expect(parsePragueLocal("2026-03-29T02:00")).toBeNull();
      expect(parsePragueLocal("2026-03-29T02:30")).toBeNull();
    });
  });

  describe("fall back, 2026-10-25", () => {
    it("handles the times around the repeat", () => {
      expect(parsePragueLocal("2026-10-25T01:59")?.toISOString()).toBe("2026-10-24T23:59:00.000Z");
      expect(parsePragueLocal("2026-10-25T03:00")?.toISOString()).toBe("2026-10-25T02:00:00.000Z");
    });

    it("takes the first of a repeated time", () => {
      expect(parsePragueLocal("2026-10-25T02:30")?.toISOString()).toBe("2026-10-25T00:30:00.000Z");
    });
  });

  it("handles the first and last minute of a day", () => {
    expect(parsePragueLocal("2026-11-05T00:00")?.toISOString()).toBe("2026-11-04T23:00:00.000Z");
    expect(parsePragueLocal("2026-11-05T23:59")?.toISOString()).toBe("2026-11-05T22:59:00.000Z");
  });

  it("rejects malformed values and impossible dates", () => {
    for (const value of ["", "soon", "2026-11-05", "2026-11-05 12:00", "2026-11-05T12:00Z", "2026-02-30T12:00", "2026-13-01T12:00", "2026-11-05T25:00"]) {
      expect(parsePragueLocal(value)).toBeNull();
    }
  });
});

describe("pragueMinuteOfDay", () => {
  it("counts minutes on the Prague clock, not the host clock", () => {
    expect(pragueMinuteOfDay(new Date("2026-01-15T11:00:00Z"))).toBe(12 * 60);
    expect(pragueMinuteOfDay(new Date("2026-07-15T10:00:00Z"))).toBe(12 * 60);
    expect(pragueMinuteOfDay(new Date("2026-11-04T23:00:00Z"))).toBe(0);
    expect(pragueMinuteOfDay(new Date("2026-11-05T22:59:00Z"))).toBe(23 * 60 + 59);
  });
});

describe("formatPragueDateTime", () => {
  it("shows Prague time", () => {
    expect(formatPragueDateTime(new Date("2026-07-15T10:05:00Z"))).toBe("15.07.2026, 12:05");
  });
});
