import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/account/queries";
import OrderCreateForm from "@/components/account/OrderCreateForm";

export default async function NewOrderPage() {
  const supabase = await createClient();

  // Грузим параллельно: слоты для select + абонемент для превью
  const [slotsRes, subscription] = await Promise.all([
    supabase.from("delivery_slots").select("*").order("display_order"),
    getActiveSubscription(supabase),
  ]);

  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl text-ink">Новый заказ</h2>
      <p className="mt-2 text-sm text-ink-muted">Заполните данные доставки.</p>
      <div className="mt-6">
        <OrderCreateForm
          slots={slotsRes.data ?? []}
          subscription={subscription}
        />
      </div>
    </section>
  );
}

