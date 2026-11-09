import type { Json } from "@/types/database";
import { getFormKind } from "../options/forms/index.ts";
import type { AdminClient } from "../supabase/admin.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClientOptionSummary = { id: string; name: string };

export type ClientOption = {
  id: string;
  name: string;
  formKind: string;
  tariffKind: string;
  tariffParams: Json;
  formDefaults: Json;
};

const OPTION_COLUMNS =
  "id, custom_name, display_order, tariff_kind, tariff_params, form_defaults, active, " +
  "service_options!inner(name, form_kind, active, display_order)";

type OptionRow = {
  id: string;
  custom_name: string | null;
  display_order: number;
  tariff_kind: string;
  tariff_params: Json;
  form_defaults: Json;
  active: boolean;
  service_options: { name: string; form_kind: string; active: boolean; display_order: number };
};

/** Опцию можно заказать: она и её каталог включены, а вид формы есть в коде. */
function isOrderable(row: OptionRow): boolean {
  return row.active && row.service_options.active && getFormKind(row.service_options.form_kind) !== null;
}

const nameOf = (row: OptionRow) => row.custom_name ?? row.service_options.name;

/** Опции клиента для «Новый заказ», в порядке показа. */
export async function listClientOptions(db: AdminClient, clientId: string): Promise<ClientOptionSummary[]> {
  const { data, error } = await db
    .from("client_options")
    .select(OPTION_COLUMNS)
    .eq("client_id", clientId)
    .eq("active", true)
    .eq("service_options.active", true)
    .returns<OptionRow[]>();
  if (error) throw error;

  return data
    .filter(isOrderable)
    .sort(
      (a, b) =>
        a.display_order - b.display_order || a.service_options.display_order - b.service_options.display_order,
    )
    .map((row) => ({ id: row.id, name: nameOf(row) }));
}

/** Опция для формы заказа: только своя, включённая и с известным видом формы, иначе `null`. */
export async function loadClientOption(
  db: AdminClient,
  clientId: string,
  clientOptionId: string,
): Promise<ClientOption | null> {
  if (!UUID_RE.test(clientOptionId)) return null;

  const { data, error } = await db
    .from("client_options")
    .select(OPTION_COLUMNS)
    .eq("id", clientOptionId)
    .eq("client_id", clientId)
    .returns<OptionRow[]>()
    .maybeSingle();
  if (error) throw error;
  if (!data || !isOrderable(data)) return null;

  return {
    id: data.id,
    name: nameOf(data),
    formKind: data.service_options.form_kind,
    tariffKind: data.tariff_kind,
    tariffParams: data.tariff_params,
    formDefaults: data.form_defaults,
  };
}
