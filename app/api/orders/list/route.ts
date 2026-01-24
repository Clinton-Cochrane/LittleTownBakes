import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // avoid caching headaches while you iterate

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  status: "new" | "in_progress" | "complete";
  total_cents: number;
};

export async function GET() {
  // TEMP: mocked data so prod build works even without a DB
  const orders: Order[] = [
    {
      id: "ord_001",
      created_at: new Date().toISOString(),
      customer_name: "Test Customer",
      status: "new",
      total_cents: 2599,
    },
  ];

  return NextResponse.json({ orders });
}
