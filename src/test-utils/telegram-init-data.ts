import { createHmac } from "node:crypto";

/** Подпись `initData` по алгоритму из документации Telegram — независимо от проверяемого кода. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}
