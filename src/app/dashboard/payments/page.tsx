import { createClient } from "@/lib/supabase/server";
import { getPayments } from "@/lib/account/queries";
import PaymentsTable from "@/components/account/PaymentsTable";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const payments = await getPayments(supabase);

  return (
    <section>
      <h2 className="font-display text-2xl text-ink">История платежей</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Все операции и их статусы.
      </p>
      <div className="mt-6">
        <PaymentsTable payments={payments} />
      </div>
    </section>
  );
}