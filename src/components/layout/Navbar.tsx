import NavbarClient from "./NavbarClient";

// Серверная обёртка без данных: корневой layout не обращается к Supabase,
// поэтому лендинг собирается статически. Статус входа определяет NavbarClient.
export default function Navbar() {
  return <NavbarClient />;
}
