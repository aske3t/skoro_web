import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/account/queries";
import SubscriptionCard from "@/components/account/SubscriptionCard";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const subscription = await getActiveSubscription(supabase);

  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl text-ink">Ваш абонемент</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Тариф и остаток доставок на текущий период.
      </p>
      <div className="mt-6">
        <SubscriptionCard subscription={subscription} detailed />
      </div>
    </section>
  );
}