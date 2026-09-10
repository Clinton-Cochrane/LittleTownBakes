export type Category = {
    id: string;
    name: string;
    sortOrder?: number;
}

export type Availability = {
    inStock: boolean;
}

export type Item = {
    id: string;
    name: string;
    categoryId: string;
    description?: string;
    basePrice: number;
    image?: string;
    tags?: string[];
    availability: Availability;
    maxPerOrder?: number;
    isArchived?: boolean;
	sortOrder?: number;
    variants?: Array<{id: string; name: string; deltaPrice?: number; price?: number}>;
};

/** Item with inventory-derived availability (from API) */
export type EnrichedItem = Item & {
    remaining?: number;
    available?: boolean;
};

export type MenuCatalog = {
    categories: Category[];
    items: Item[];
};

export type Section = {
    category: Category;
    items: Item[];
};

/*----helpers----*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isItemAvailable(item: Item, _now = new Date()): boolean {
    return item?.availability.inStock === true;
}

export function formatCurrency(n:number, locale = "en-US", currency = "USD") {
    try{
        return new Intl.NumberFormat(locale, {style: "currency", currency}).format(n);
    } catch {
        return `$${n.toFixed(2)}`;
    }
}

/*Group + Sort -> sections for UI. Skips orphaned Items; logs once*/
export function buildSections(catalog:MenuCatalog): Section[] {
    const catById = new Map(catalog.categories.map((c) => [c.id, c]));
    const orphanIds: string[] = [];

    const itemsByCat = new Map<string, Item[]>();
    for (const item of catalog.items) {
        if(!catById.has(item.categoryId)) {
            orphanIds.push(item.id);
            continue;
        }
        const arr = itemsByCat.get(item.categoryId) ?? [];
        arr.push(item);
        itemsByCat.set(item.categoryId,arr);
    }
    if(orphanIds.length) {
        console.warn("[buildSections] Orphan items (bad categoryId):", orphanIds);
    }

    const categoriesSorted = [...catalog.categories].sort((a,b) => {
        const ao = a.sortOrder ?? 9999;
        const bo = b.sortOrder ?? 9999;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
    });

    const sections: Section[] = categoriesSorted.map((cat) => {
		const items = (itemsByCat.get(cat.id) ?? []).sort((a,b) => {
			const sortOrderDifference = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
			if (sortOrderDifference !== 0) return sortOrderDifference;
			const nameDifference = a.name.localeCompare(b.name);
			if (nameDifference !== 0) return nameDifference;
			return a.id.localeCompare(b.id);
		});
        return {category:cat, items};
    }).filter((section) => section.items.length > 0);

    return sections;
}
