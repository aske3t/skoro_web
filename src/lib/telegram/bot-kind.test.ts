import { describe, expect, it } from "vitest";
import { parseBotKind } from "./bot-kind";

describe("parseBotKind", () => {
  it("defaults to the service bot", () => {
    expect(parseBotKind([])).toBe("service");
    expect(parseBotKind(["--info"])).toBe("service");
  });

  it("reads both flag forms", () => {
    expect(parseBotKind(["--bot", "client"])).toBe("client");
    expect(parseBotKind(["--info", "--bot", "service"])).toBe("service");
    expect(parseBotKind(["--bot=client"])).toBe("client");
  });

  it("rejects a missing or unknown value", () => {
    expect(() => parseBotKind(["--bot"])).toThrow();
    expect(() => parseBotKind(["--bot", "--info"])).toThrow();
    expect(() => parseBotKind(["--bot=clients"])).toThrow();
  });
});
