import {NextRequest, NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabaseAdmin";

export async function GET (req: NextRequest) {
    const adminKey = req.headers.get("x-admin-key");
    if(adminKey !== process.env.ADMIN_KEY)return new NextResponse("Unauthorized", {status: 401});

    const supabaseAdmin = getSupabaseAdmin();
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    let query = supabaseAdmin.from("orders").select("payload").order("created_at", {ascending:false});
    if(status) query = query.contains("payload", {status});

    const {data, error} = await query;
    if(error) return NextResponse.json({error: error.message}, {status: 400});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json((data ?? []).map((r:any) => r.payload));
}