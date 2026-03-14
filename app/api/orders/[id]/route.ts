import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

<<<<<<< HEAD
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const { data, error } = await supabaseAdmin
		.from("orders")
		.select("payload")
		.eq("id", id)
		.single();

	if (error || !data) return new NextResponse("Not found", { status: 404 });
	return NextResponse.json(data.payload);
}
=======
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // 🔑 TEMP: if Supabase isn't configured, return fake data
  if (!process.env.SUPABASE_URL) {
    return NextResponse.json({
      id,
      status: "MOCK",
      customer: { name: "Test Customer" },
      items: [],
      totals: { subtotal: 2500, tax: 200, total: 2700 },
      createdAt: new Date().toISOString(),
    });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("payload")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(data.payload);
}
>>>>>>> a004a02a44dfab223c819b0df54706f05fc1824c
