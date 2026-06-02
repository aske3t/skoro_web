import { createClient } from "@/lib/supabase/client";

export type CreateOrderInput = {
  fromAddress: string;
  toAddress: string;
  slotId: string;
  scheduledFor: string;
  recipientContact: string;
  comment: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_order_for_user", {
    p_from_address: input.fromAddress,
    p_to_address: input.toAddress,
    p_slot_id: input.slotId,
    p_scheduled_for: input.scheduledFor,
    p_recipient_contact: input.recipientContact,
    p_comment: input.comment,
  });
  if (error) throw error;
  return data;
}
