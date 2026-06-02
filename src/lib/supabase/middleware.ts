import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          // 1) Кладём в request — чтобы дальше по цепочке в этом же запросе
          //    Supabase видел свежие куки.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // 2) Пересобираем response, чтобы он унаследовал обновлённый request.
          supabaseResponse = NextResponse.next({ request });
          // 3) Кладём в response — это то, что реально уйдёт в Set-Cookie
          //    и сохранится в браузере. Опции пробрасываем как есть.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Триггерит ротацию токена при необходимости. Не убирать.
  await supabase.auth.getUser();

  return supabaseResponse;
}