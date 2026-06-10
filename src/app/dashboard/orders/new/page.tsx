import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/account/queries";
import OrderCreateForm from "@/components/account/OrderCreateForm";

export default async function NewOrderPage() {
  const supabase = await createClient();

  // Грузим параллельно: слоты + конфиг рабочих часов + абонемент для превью
  const [slotsRes, serviceRes, subscription] = await Promise.all([
    supabase.from("delivery_slots").select("*").order("display_order"),
    supabase.from("service_config").select("*").single(),
    getActiveSubscription(supabase),
  ]);

  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl text-ink">Новый заказ</h2>
      <p className="mt-2 text-sm text-ink-muted">Заполните данные доставки.</p>
      <div className="mt-6">
        <OrderCreateForm
          slots={slotsRes.data ?? []}
          service={serviceRes.data!}
          subscription={subscription}
        />
      </div>
    </section>
  );
}

