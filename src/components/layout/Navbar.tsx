import { createClient } from "@/lib/supabase/server";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Из юзера достаём только то, что нужно UI — чтобы не таскать в клиент
  // полный объект с метаданными и токенами.
  return <NavbarClient user={user ? { email: user.email ?? "" } : null} />;
}
