// Страницы услуг (/services/[slug]) и ссылки на них в футере.
// TODO(владелец): описание каждой услуги. Пока поле пустое, на странице стоит плейсхолдер.
export type Service = {
  slug: string;
  title: string;
  description: string;
};

export const services: Service[] = [
  { slug: "documents", title: "Доставка документов", description: "" },
  { slug: "power-of-attorney", title: "Курьер по доверенности", description: "" },
  { slug: "on-demand", title: "Курьер под задачу", description: "" },
  { slug: "express", title: "Экспресс-доставка", description: "" },
  { slug: "intercity", title: "Междугородние перевозки", description: "" },
  { slug: "moving", title: "Крупногабаритные перевозки и переезды", description: "" },
  { slug: "international", title: "Посылки за границу", description: "" },
];

export function serviceHref(slug: string): string {
  return `/services/${slug}`;
}

export function findService(slug: string): Service | undefined {
  return services.find(s => s.slug === slug);
}
