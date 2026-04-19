import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <p className="mt-4 text-white/80">
        Signed in as <span className="text-brand">{user.email}</span>.
      </p>
      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-hover"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
