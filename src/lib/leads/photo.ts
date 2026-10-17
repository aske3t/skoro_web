import { PHOTO_MAX_BYTES } from "./constants";

export type PhotoType = "image/jpeg" | "image/png" | "image/webp";
export type PhotoUpload = { bytes: Uint8Array; type: PhotoType };
export type PhotoCheck =
  | { ok: true; type: PhotoType }
  | { ok: false; code: "invalid" | "too_large" };

/** Тип по первым байтам: заголовку Content-Type от клиента не верим. */
export function detectImageType(bytes: Uint8Array): PhotoType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    bytes.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((b, i) => bytes[i] === b) &&
    [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)
  ) {
    return "image/webp";
  }
  return null;
}

export function checkPhoto(bytes: Uint8Array): PhotoCheck {
  if (bytes.length > PHOTO_MAX_BYTES) return { ok: false, code: "too_large" };
  const type = detectImageType(bytes);
  return type ? { ok: true, type } : { ok: false, code: "invalid" };
}
