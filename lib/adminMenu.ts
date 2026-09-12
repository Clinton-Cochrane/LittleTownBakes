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

export type AdminMenuSection = {
	category: AdminMenuCategory;
	products: AdminMenuProduct[];
};

const alphabetical = new Intl.Collator("en", { sensitivity: "base" });

function compareByName(
	left: { id: string; name: string },
	right: { id: string; name: string },
) {
	return alphabetical.compare(left.name, right.name)
		|| (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

/** Groups the Admin Menu independently of API order and inventory state. */
export function buildAdminMenuSections(
	categories: AdminMenuCategory[],
	products: AdminMenuProduct[],
): AdminMenuSection[] {
	return [...categories]
		.sort(compareByName)
		.map((category) => ({
			category,
			products: products
				.filter((product) => product.categoryId === category.id)
				.sort(compareByName),
		}))
		.filter((section) => section.products.length > 0);
}

export function splitMenuProducts(products: AdminMenuProduct[]) {
	const active = products.filter((product) => !product.isArchived);
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
