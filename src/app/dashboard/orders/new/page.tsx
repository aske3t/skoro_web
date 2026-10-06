import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/account/queries";
import OrderCreateForm from "@/components/account/OrderCreateForm";

export default async function NewOrderPage() {
  const supabase = await createClient();

  // Грузим параллельно: слоты + конфиг рабочих часов + абонемент для превью
  const [slotsRes, serviceRes, subscription] = await Promise.all([
    supabase.from("delivery_slots").select("*").order("display_order"),
    supabase.from("service_config").select("*").maybeSingle(),
    getActiveSubscription(supabase),
  ]);

  // Без рабочих часов форма не может выбрать слот — показываем сообщение, а не падаем.
  const service = serviceRes.data;
  if (serviceRes.error) {
    console.error("[orders/new] service_config load failed:", serviceRes.error);
  }

  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl text-ink">Новый заказ</h2>
      {service ? (
        <>
          <p className="mt-2 text-sm text-ink-muted">Заполните данные доставки.</p>
          <div className="mt-6">
            <OrderCreateForm
              slots={slotsRes.data ?? []}
              service={service}
              subscription={subscription}
            />
          </div>
        </>
      ) : (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-hairline-strong bg-bg-soft/60 p-4 text-sm text-ink-muted"
        >
          Не удалось загрузить настройки сервиса. Свяжитесь с нами:{" "}
          <a href="tel:+420795402571" className="font-mono text-brand-glow underline-offset-4 hover:underline">
            +420 795 402 571
          </a>
        </div>
      )}
    </section>
  );
}

