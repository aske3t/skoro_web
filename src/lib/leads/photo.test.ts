import { describe, expect, it } from "vitest";
import { PHOTO_MAX_BYTES } from "./constants";
import { checkPhoto, detectImageType } from "./photo";

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

describe("detectImageType", () => {
  it("recognises JPEG, PNG and WebP by magic bytes", () => {
    expect(detectImageType(new Uint8Array(JPEG))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array(PNG))).toBe("image/png");
    expect(detectImageType(new Uint8Array(WEBP))).toBe("image/webp");
  });

  it("rejects other content, including text and empty data", () => {
    expect(detectImageType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("checkPhoto", () => {
  it("accepts a valid image", () => {
    expect(checkPhoto(new Uint8Array(JPEG))).toEqual({ ok: true, type: "image/jpeg" });
  });

  it("rejects a non-image as invalid", () => {
    expect(checkPhoto(new TextEncoder().encode("hello"))).toEqual({ ok: false, code: "invalid" });
  });

  it("rejects files over the size limit", () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(JPEG);
    expect(checkPhoto(big)).toEqual({ ok: false, code: "too_large" });
  });
});
