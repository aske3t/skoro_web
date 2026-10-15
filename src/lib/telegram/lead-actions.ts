import type { AdminClient } from "../supabase/admin.ts";
import type { LeadNotification } from "../leads/notify.ts";
import type { LeadAction } from "./callback-data.ts";

const LEAD_COLUMNS =
  "id, created_at, kind, first_name, last_name, email, phone, message, utm, status, handled_by_name, handled_at";

const STATUS_BY_ACTION = {
  take: "in_progress",
  spam: "spam",
} as const satisfies Record<LeadAction, string>;

export type HandledLead = LeadNotification & {
  status: string;
  handled_by_name: string | null;
  handled_at: string | null;
};

export type LeadActionResult =
  | { code: "ok"; lead: HandledLead; handledAt: Date }
  | { code: "already_handled"; lead: HandledLead }
  | { code: "not_found" }
  | { code: "error" };

/**
 * Идемпотентно: статус меняется только у заявки в статусе `new`. Повторный update
 * от Telegram или нажатие двух админов сразу даёт `already_handled`.
 * Права проверяет вызывающий код.
 */
export async function applyLeadAction(params: {
  db: AdminClient;
  action: LeadAction;
  leadId: string;
  actor: { id: number; name: string };
  now?: Date;
}): Promise<LeadActionResult> {
  const { db, action, leadId, actor } = params;
  const handledAt = params.now ?? new Date();

  const updated = await db
    .from("leads")
    .update({
      status: STATUS_BY_ACTION[action],
      handled_by_tg_id: actor.id,
      handled_by_name: actor.name,
      handled_at: handledAt.toISOString(),
    })
    .eq("id", leadId)
    .eq("status", "new")
    .select(LEAD_COLUMNS)
    .maybeSingle();

  if (updated.error) return { code: "error" };
  if (updated.data) return { code: "ok", lead: updated.data, handledAt };

  const current = await db.from("leads").select(LEAD_COLUMNS).eq("id", leadId).maybeSingle();
  if (current.error) return { code: "error" };
  if (!current.data) return { code: "not_found" };
  return { code: "already_handled", lead: current.data };
}
