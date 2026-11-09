import { OrderApp } from "@/components/tg/OrderApp";

/** Форма опции клиента. Кто открыл, страница узнаёт только из `initData` Telegram — на сервере. */
export default async function OrderPage({ params }: { params: Promise<{ clientOptionId: string }> }) {
  const { clientOptionId } = await params;
  return <OrderApp clientOptionId={clientOptionId} />;
}
