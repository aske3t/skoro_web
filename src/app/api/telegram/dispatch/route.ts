import { webhookCallback } from "grammy";
import { createBot } from "@/lib/telegram/bot";
import { isValidWebhookSecret } from "@/lib/telegram/webhook-secret";

export const runtime = "nodejs";

const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const received = request.headers.get(SECRET_HEADER);
  if (!expected || !isValidWebhookSecret(received, expected)) {
    return new Response(null, { status: 401 });
  }

  const bot = createBot();
  return webhookCallback(bot, "std/http")(request);
}
