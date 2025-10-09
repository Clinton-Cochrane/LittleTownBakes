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
    variants?: Array<{id: string; name: string; deltaPrice?: number; price?: number}>;
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

/*Light validation*/
export async function getMenuCatalog(): Promise<MenuCatalog> {
    try{
        const res = await fetch("/menu.json", {cache: "no-store"});
        if(!res.ok) throw new Error(`Failed to fetch menu.json: ${res.status}`);
        const data = (await res.json()) as Partial<MenuCatalog>;

        const categories = Array.isArray(data.categories) ? data.categories:[];
        const items = Array.isArray(data.items) ? data.items: [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizedItems : Item[] = items.map((it:any) => ({
            ...it,
            id: String(it.id ?? "").trim(),
            name: String(it.name ?? "").trim(),
            categoryId: String(it.categoryId ?? "").trim(),
            basePrice: typeof it.basePrice === "number" ? it.basePrice: Number(it.basePrice ?? 0),
            availability: {inStock: Boolean(it?.availability?.inStock)},
        }))
        .filter((it:Item) => it.id && it.name && it.categoryId);
        return {categories, items: normalizedItems};
    } catch (e) {
        console.error("[getMenuCatalog]errors:", e);
        return {categories:[], items:[]};
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
        const items = (itemsByCat.get(cat.id) ?? []).sort((a,b) =>
            a.name.localeCompare(b.name)
        );
        return {category:cat, items};
    });

    return sections;
}

