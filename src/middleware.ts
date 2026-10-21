import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Сессия нужна только ЛК и auth-маршрутам; лендинг остаётся статическим.
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
};
