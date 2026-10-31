"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { setAudience, type Audience } from "@/lib/audience";

// Ссылка, которая заодно переключает версию сайта: например, заявка со страниц для частных
// клиентов открывает форму сразу в варианте «Частное лицо».
export function AudienceLink({ audience, onClick, ...props }: ComponentProps<typeof Link> & { audience: Audience }) {
  return (
    <Link
      {...props}
      onClick={e => {
        setAudience(audience);
        onClick?.(e);
      }}
    />
  );
}
