import { NextResponse } from "next/server";
import {supabaseAdmin} from "@/lib/supabaseAdmin";

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