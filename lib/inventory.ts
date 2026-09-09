/** One authoritative current stock row for a product. */
export type ProductInventory = {
	product_id: string;
	quantity_on_hand: number;
	updated_at?: string;
};

/** Missing inventory is treated as zero so all read paths fail closed. */
export function getQuantityOnHand(inventory: ProductInventory[], productId: string): number {
	return inventory.find((row) => row.product_id === productId)?.quantity_on_hand ?? 0;
}
