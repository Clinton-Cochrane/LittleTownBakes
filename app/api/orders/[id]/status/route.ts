import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord, OrderStatus } from "@/lib/orderTypes";
import { notifyStatusChange } from "@/lib/notify";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { status } = (await req.json()) as { status: OrderStatus };

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("payload")
    .eq("id", id)
    .single();

  if (error || !data) return new NextResponse("Not found", { status: 404 });

  const updated: OrderRecord = { ...data.payload, status };

  const { error: upErr } = await supabaseAdmin
    .from("orders")
    .update({ status, payload: updated })
    .eq("id", id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  notifyStatusChange(updated).catch(console.warn);
  return NextResponse.json({ ok: true });
}
