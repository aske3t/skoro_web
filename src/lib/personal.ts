// Версия сайта для частных клиентов: /personal и подстраницы, ссылки на них в футере (P-42).
// TODO(владелец): тексты страниц. Пока поле пустое, на странице плейсхолдер, а сама страница закрыта от поисковиков.
export type PersonalPage = {
  slug: string;
  title: string;
  description: string;
};

export const personalPages: PersonalPage[] = [
  { slug: "price", title: "Цена доставки", description: "" },
  { slug: "how-to-order", title: "Как заказать", description: "" },
  { slug: "faq", title: "Частые вопросы", description: "" },
];

// TODO(владелец): вопросы и ответы для /personal/faq. Пустые пары показываются плейсхолдерами.
export const faq: { question: string; answer: string }[] = [
  { question: "", answer: "" },
  { question: "", answer: "" },
  { question: "", answer: "" },
];

export function personalHref(slug: string): string {
  return `/personal/${slug}`;
}

export function findPersonalPage(slug: string): PersonalPage | undefined {
  return personalPages.find(p => p.slug === slug);
}

/** Страница ещё шаблон: в поиск её не пускаем, чтобы не индексировать плейсхолдеры. */
export function isPersonalDraft(page: PersonalPage): boolean {
  if (!page.description) return true;
  return page.slug === "faq" && faq.some(item => !item.question || !item.answer);
}
