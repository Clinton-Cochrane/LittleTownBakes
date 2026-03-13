/**
 * Inventory helpers: period computation and availability logic.
 * Works with inventory_slots table (item_id, period_type, period_start, quantity_available, quantity_sold).
 */

export type PeriodType = "week" | "month";

export type InventorySlot = {
	id: string;
	item_id: string;
	period_type: PeriodType;
	period_start: string;
	quantity_available: number;
	quantity_sold: number;
	created_at?: string;
};

/** Start of week (Monday) for a given date, ISO string */
export function getWeekStart(d: Date): string {
	const date = new Date(d);
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	date.setDate(diff);
	return date.toISOString().slice(0, 10);
}

/** First day of month for a given date, ISO string */
export function getMonthStart(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Remaining quantity for an item in a slot */
export function getRemaining(slot: InventorySlot): number {
	return Math.max(0, slot.quantity_available - slot.quantity_sold);
}

/** Whether an item is available (has remaining quantity) in the given slot */
export function isSlotAvailable(slot: InventorySlot): boolean {
	return getRemaining(slot) > 0;
}

/**
 * Find the best-matching slot for current period.
 * Prefers week over month if both exist (more granular).
 */
export function findRelevantSlot(
	slots: InventorySlot[],
	itemId: string,
	now: Date
): InventorySlot | null {
	const weekStart = getWeekStart(now);
	const monthStart = getMonthStart(now);

	const weekSlot = slots.find(
		(s) => s.item_id === itemId && s.period_type === "week" && s.period_start === weekStart
	);
	if (weekSlot) return weekSlot;

	const monthSlot = slots.find(
		(s) => s.item_id === itemId && s.period_type === "month" && s.period_start === monthStart
	);
	if (monthSlot) return monthSlot;

	return null;
}

export type OrderItemQty = { id: string; qty: number };

/**
 * Validate that order items can be fulfilled from inventory.
 * Returns error message if any item exceeds available quantity.
 */
export function validateOrderAgainstSlots(
	slots: InventorySlot[],
	items: OrderItemQty[],
	now: Date
): string | null {
	for (const item of items) {
		const slot = findRelevantSlot(slots, item.id, now);
		if (slot) {
			const remaining = getRemaining(slot);
			if (item.qty > remaining) {
				return `Item ${item.id}: only ${remaining} available`;
			}
		}
	}
	return null;
}
