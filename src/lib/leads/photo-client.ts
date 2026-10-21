// Браузерная подготовка фото: уменьшение и перекодирование в JPEG через canvas.
// Без новых зависимостей. Сервер всё равно проверяет тип и размер (photo.ts).
import {
  PHOTO_ACCEPT,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
  PHOTO_SOURCE_MAX_BYTES,
} from "./constants";

export type PreparedPhoto =
  | { ok: true; file: File }
  | { ok: false; code: "invalid" | "too_large" };

/** Размер, вписанный в квадрат max×max с сохранением пропорций; не увеличивает. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const ACCEPTED_TYPES = PHOTO_ACCEPT.split(",");

async function compress(file: File): Promise<Blob | null> {
  // createImageBitmap учитывает EXIF-поворот; сами EXIF (в т.ч. GPS) в результат не попадают.
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff"; // прозрачный PNG не станет чёрным в JPEG
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) return { ok: false, code: "invalid" };
  if (file.size > PHOTO_SOURCE_MAX_BYTES) return { ok: false, code: "too_large" };

  try {
    const blob = await compress(file);
    if (blob && blob.size <= PHOTO_MAX_BYTES) {
      return { ok: true, file: new File([blob], "photo.jpg", { type: "image/jpeg" }) };
    }
  } catch {
    // Браузер не смог декодировать (например, HEIC вне Safari) — пробуем исходник.
  }

  if (!ACCEPTED_TYPES.includes(file.type)) return { ok: false, code: "invalid" };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, code: "too_large" };
  return { ok: true, file };
}
