import { createHash, randomBytes } from "node:crypto";

// Приглашение в клиентский бот (ADR-0006 §5).
const TOKEN_BYTES = 16;
const START_PREFIX = "inv_";
const START_RE = /^inv_([0-9a-f]{32})$/;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 32 случайных hex-символа. В БД хранится только хэш. */
export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInviteLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${START_PREFIX}${token}`;
}

/** Токен из параметра `/start`; `null`, если это не приглашение. */
export function parseInviteStart(payload: string | undefined | null): string | null {
  return START_RE.exec(payload ?? "")?.[1] ?? null;
}

export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_MS);
}

export function isInviteExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
