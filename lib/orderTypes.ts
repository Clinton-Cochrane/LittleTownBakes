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

export type PickupSnapshot = {
	windowId: string;
	startAt: string;
	endAt: string;
};

export type OrderRecord = {
	id: string;
	createdAt: string;
	fulfillmentStatus: FulfillmentStatus;
	payment: { method: PaymentMethod; status: PaymentStatus; venmoUser?: string; note?: string };
	customer: { name: string; email: string; phone?: string; notes?: string };
	pickup?: PickupSnapshot;
	items: OrderItem[];
	totals: { subtotalCents: number; totalCents: number };
};

export type PublicOrderTracking = Pick<OrderRecord, "fulfillmentStatus" | "payment" | "items" | "totals"> & {
	pickup?: Pick<PickupSnapshot, "startAt" | "endAt">;
};
export type AdminOrderRecord = OrderRecord & { trackingToken: string | null };
