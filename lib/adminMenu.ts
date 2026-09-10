export type AdminMenuProduct = {
	id: string;
	categoryId: string;
	name: string;
	description: string;
	priceCents: number;
	image: string | null;
	maxPerOrder: number;
	isArchived: boolean;
	sortOrder: number;
	quantityOnHand: number;
	soldCount: number;
	demandCount: number;
	currentDemandCount: number;
};

export type AdminMenuCategory = {
	id: string;
	name: string;
	sortOrder: number;
};

export function splitMenuProducts(products: AdminMenuProduct[]) {
	const active = products
		.filter((product) => !product.isArchived)
		.sort((left, right) => Number(left.quantityOnHand === 0) - Number(right.quantityOnHand === 0));
	const archived = products.filter((product) => product.isArchived);
	return { active, archived };
}

export function parseRefillAmount(value: string): number | null {
	if (!/^\s*\d+\s*$/.test(value)) return null;
	const amount = Number(value);
	return Number.isSafeInteger(amount) && amount <= 2_147_483_647 ? amount : null;
}

/** Runs actions in order for each product while allowing other products to update independently. */
export class ProductActionQueue {
	private readonly pending = new Map<string, Promise<void>>();

	enqueue(productId: string, action: () => Promise<void>): Promise<void> {
		const previous = this.pending.get(productId) ?? Promise.resolve();
		const current = previous.catch(() => undefined).then(action);
		this.pending.set(productId, current);
		const cleanup = () => {
			if (this.pending.get(productId) === current) this.pending.delete(productId);
		};
		void current.then(cleanup, cleanup);
		return current;
	}
}
