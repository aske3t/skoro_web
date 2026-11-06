// Без zod: поля формы нужны клиентским компонентам Mini App, схема живёт в city-delivery.ts.
export type FormFieldType =
  | "location"
  | "address"
  | "text"
  | "phone"
  | "delivery_mode"
  | "datetime"
  | "textarea"
  | "photo";

export type FormField = {
  name: string;
  type: FormFieldType;
  required: boolean;
  label: string;
};

export { DELIVERY_MODES } from "../../leads/constants.ts";

export const CITY_DELIVERY_LABELS = {
  pickup: "Откуда",
  deliveryAddress: "Куда",
  deliveryTime: "Когда доставить",
  recipientName: "Имя получателя",
  recipientPhone: "Телефон получателя",
  comment: "Комментарий по заказу",
  photo: "Фото отправления",
  asap: "Как можно скорее",
} as const;

// «Откуда» — точка клиента или адрес: нужно одно из двух, это проверяет схема.
export const CITY_DELIVERY_FIELDS: readonly FormField[] = [
  { name: "pickupLocationId", type: "location", required: false, label: CITY_DELIVERY_LABELS.pickup },
  { name: "pickupAddress", type: "address", required: false, label: CITY_DELIVERY_LABELS.pickup },
  { name: "deliveryAddress", type: "address", required: true, label: CITY_DELIVERY_LABELS.deliveryAddress },
  { name: "recipientName", type: "text", required: false, label: CITY_DELIVERY_LABELS.recipientName },
  { name: "recipientPhone", type: "phone", required: false, label: CITY_DELIVERY_LABELS.recipientPhone },
  { name: "deliveryMode", type: "delivery_mode", required: true, label: CITY_DELIVERY_LABELS.deliveryTime },
  { name: "deliveryAt", type: "datetime", required: false, label: CITY_DELIVERY_LABELS.deliveryTime },
  { name: "comment", type: "textarea", required: false, label: CITY_DELIVERY_LABELS.comment },
  { name: "photo", type: "photo", required: false, label: CITY_DELIVERY_LABELS.photo },
];
