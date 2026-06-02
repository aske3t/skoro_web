"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/account/createOrder";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Tables } from "@/types/database";
import type { Subscription } from "@/lib/account/queries"

type Props = {
    slots: Tables<"delivery_slots">[];
    subscription: Subscription | null;
};

export default function OrderCreateForm({ slots, subscription }: Props) {
    const router = useRouter();
// По одному useState на каждое поле — простой и явный способ
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [scheduledFor, setScheduledFor] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [comment, setComment] = useState("");

  // Отдельно — техническое состояние формы
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createOrder({
        fromAddress,
        toAddress,
        slotId,
        scheduledFor: new Date(scheduledFor).toISOString(),
        recipientContact,
        comment: comment.trim() || null,
      });
      router.push("/dashboard/orders");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заказ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Превью: что произойдёт с этим заказом */}
      {subscription ? (
        <div className="rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm text-brand-glow">
          Спишется с абонемента «{subscription.tier_name}». После заказа
          остаток: {subscription.remaining_deliveries - 1}.
        </div>
      ) : (
        <div className="rounded-2xl border border-hairline-strong bg-bg-soft/60 p-4 text-sm text-ink-muted">
          Без активного абонемента заказ создастся со статусом «ожидает
          оплаты». Менеджер пришлёт реквизиты.
        </div>
      )}

      <FieldGroup label="Откуда">
        <Input
          required
          value={fromAddress}
          onChange={(e) => setFromAddress(e.target.value)}
          placeholder="Brno, Veveří 95"
        />
      </FieldGroup>

      <FieldGroup label="Куда">
        <Input
          required
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          placeholder="Brno, Lidická 12"
        />
      </FieldGroup>

      <FieldGroup label="Дата и время">
        <Input
          type="datetime-local"
          required
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Слот">
        <select
          required
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
          className="w-full rounded-full border border-white/20 bg-white/5 px-5 py-3 text-white focus:border-brand focus:outline-none"
        >
          {slots.map((s) => (
            <option key={s.id} value={s.id} className="bg-bg text-ink">
              {s.label}
              {s.sub_label ? ` · ${s.sub_label}` : ""}
              {!subscription ? ` — ${s.base_price} Kč` : ""}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Контакт получателя">
        <Input
          required
          value={recipientContact}
          onChange={(e) => setRecipientContact(e.target.value)}
          placeholder="Имя и телефон"
        />
      </FieldGroup>

      <FieldGroup label="Комментарий">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Код домофона, этаж, особые инструкции…"
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
        />
      </FieldGroup>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Создаём…" : "Создать заказ"}
      </Button>
    </form>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-label text-ink-dim">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}