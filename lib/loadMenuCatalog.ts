import type { MenuResponse } from "@/lib/menuCatalog";

function isMenuResponse(value: unknown): value is MenuResponse {
	if (!value || typeof value !== "object") return false;

	const response = value as Partial<MenuResponse>;
	return Array.isArray(response.categories)
		&& Array.isArray(response.items)
		&& Array.isArray(response.archivedItems);
}

export async function loadMenuCatalog(fetchMenu: typeof fetch = fetch): Promise<MenuResponse> {
	let response: Response;
	try {
		response = await fetchMenu("/api/menu", { cache: "no-store" });
	} catch {
		throw new Error("Could not connect to the menu. Please check your connection and try again.");
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error("The menu service returned an invalid response. Please try again.");
	}

	if (!response.ok) {
		const apiError = data && typeof data === "object" && "error" in data
			? (data as { error?: unknown }).error
			: undefined;
		throw new Error(
			typeof apiError === "string" && apiError.trim()
				? apiError
				: "Menu is currently unavailable. Please try again later."
		);
	}

	if (!isMenuResponse(data)) {
		throw new Error("The menu service returned an invalid response. Please try again.");
	}

	return data;
}
