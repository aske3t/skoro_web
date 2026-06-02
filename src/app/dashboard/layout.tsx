import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardTabs from "@/components/account/DashboardTabs";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-32 pb-20 md:px-10">
      <header className="flex flex-col gap-6 border-b border-hairline pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-label text-ink-muted">
            Личный кабинет
          </div>
          <h1 className="mt-2 font-display text-3xl text-ink md:text-4xl">
            {user.email}
          </h1>
        </div>

        {/* Sign out — обычная HTML-форма на POST-роут, без JS. */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center rounded-full border border-hairline-strong px-4 py-2 font-mono text-[11px] uppercase tracking-label text-ink-muted transition hover:border-ink/40 hover:text-ink"
          >
            Выйти
          </button>
        </form>
      </header>

      <DashboardTabs />

      <main className="mt-10">{children}</main>
    </div>
  );
}

