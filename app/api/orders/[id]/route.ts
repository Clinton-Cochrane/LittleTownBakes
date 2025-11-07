import { NextResponse } from "next/server";
import {supabaseAdmin} from "@/lib/supabaseAdmin";

export async function GET(_: Request, {params} : {params: {id:string}}){
    const {data, error} = await supabaseAdmin
        .from("orders")
        .select("payload")
        .eq("id", params.id)
        .single();

        if(error || !data) return new NextResponse("Not found", {status: 404});
        return NextResponse.json(data.payload);
}