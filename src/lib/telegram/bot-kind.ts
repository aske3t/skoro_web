export type BotKind = "service" | "client";

/** Что различается у ботов на уровне маршрутов и окружения (ADR-0006 §4). */
export const BOT_CONFIG: Record<BotKind, { webhookPath: string; secretEnv: string; tokenEnv: string }> = {
  service: {
    webhookPath: "/api/telegram/dispatch",
    secretEnv: "TELEGRAM_WEBHOOK_SECRET",
    tokenEnv: "TELEGRAM_BOT_TOKEN",
  },
  client: {
    webhookPath: "/api/telegram/client",
    secretEnv: "TELEGRAM_CLIENT_WEBHOOK_SECRET",
    tokenEnv: "TELEGRAM_CLIENT_BOT_TOKEN",
  },
};

/**
 * Разбор `--bot service|client` из аргументов скрипта; без параметра — служебный бот.
 * Неверное значение — ошибка: иначе опечатка молча направила бы команду на служебный бот.
 */
export function parseBotKind(args: readonly string[]): BotKind {
  const inline = args.find((arg) => arg.startsWith("--bot="));
  const index = args.indexOf("--bot");
  if (!inline && index === -1) return "service";

  const value = inline ? inline.slice("--bot=".length) : args[index + 1];
  if (value === "service" || value === "client") return value;
  throw new Error("--bot принимает значения service или client");
}
