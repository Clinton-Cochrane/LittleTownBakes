export type FulfillmentStatus = "RECEIVED" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELED";
export type PaymentMethod = "cash" | "venmo" | "zelle";
export type PaymentStatus = "PENDING" | "PAID";

export type OrderItem = {
	productId: string;
	name: string;
	unitPriceCents: number;
	quantity: number;
	lineTotalCents: number;
};

export type OrderRecord = {
	id: string;
	createdAt: string;
	fulfillmentStatus: FulfillmentStatus;
	payment: { method: PaymentMethod; status: PaymentStatus; venmoUser?: string; note?: string };
	customer: { name: string; email: string; phone?: string; notes?: string };
	items: OrderItem[];
	totals: { subtotalCents: number; totalCents: number };
};

export type PublicOrderTracking = Pick<OrderRecord, "fulfillmentStatus" | "payment" | "items" | "totals">;
export type AdminOrderRecord = OrderRecord & { trackingToken: string | null };
