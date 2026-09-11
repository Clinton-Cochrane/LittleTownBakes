import { loadMenuCatalog } from "./loadMenuCatalog";
import type { MenuResponse } from "./menuCatalog";

export const MENU_CACHE_TTL_MS = 10 * 60 * 1_000;

const RETRY_DELAYS_MS = [500, 1_500] as const;

type MenuLoaderOptions = {
	loadCatalog?: () => Promise<MenuResponse>;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
	ttlMs?: number;
};

export function createMenuLoader({
	loadCatalog = () => loadMenuCatalog(),
	now = Date.now,
	wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
	ttlMs = MENU_CACHE_TTL_MS,
}: MenuLoaderOptions = {}) {
	let cached: { catalog: MenuResponse; loadedAt: number } | null = null;
	let inFlight: Promise<MenuResponse> | null = null;

	async function loadWithRetry(): Promise<MenuResponse> {
		for (let attempt = 0; ; attempt += 1) {
			try {
				return await loadCatalog();
			} catch (error) {
				const retryDelay = RETRY_DELAYS_MS[attempt];
				if (retryDelay === undefined) throw error;
				await wait(retryDelay);
			}
		}
	}

	function loadMenu(): Promise<MenuResponse> {
		if (cached && now() - cached.loadedAt < ttlMs) {
			return Promise.resolve(cached.catalog);
		}

		if (inFlight) return inFlight;

		const request = loadWithRetry()
			.then((catalog) => {
				cached = { catalog, loadedAt: now() };
				return catalog;
			})
			.finally(() => {
				if (inFlight === request) inFlight = null;
			});

		inFlight = request;
		return request;
	}

	function preloadMenu(): void {
		void loadMenu().catch(() => undefined);
	}

	function refreshMenu(): Promise<MenuResponse> {
		cached = null;
		return loadMenu();
	}

	return { loadMenu, preloadMenu, refreshMenu };
}

const sharedMenuLoader = createMenuLoader();

export const loadMenu = sharedMenuLoader.loadMenu;
export const preloadMenu = sharedMenuLoader.preloadMenu;
export const refreshMenu = sharedMenuLoader.refreshMenu;
