// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminMenuProduct } from "@/lib/adminMenu";
import { MenuProductCard, PastFlavorCard } from "./MenuProductCard";

function product(id = "cookie"): AdminMenuProduct {
	return {
		id,
		categoryId: "cookies",
		name: id === "cookie" ? "Chocolate Chip" : "Oatmeal",
		description: "Freshly baked cookies with a long description that is truncated in the work view and fully shown in the details view.",
		priceCents: 350,
		image: "/img/cookie.webp",
		maxPerOrder: 6,
		isArchived: false,
		sortOrder: 10,
		quantityOnHand: 12,
		soldCount: 82,
		demandCount: 31,
		currentDemandCount: 4,
	};
}

function callbacks() {
	return { onSet: vi.fn(async () => 12), onAdjust: vi.fn(), onEdit: vi.fn(), onArchive: vi.fn() };
}

afterEach(cleanup);

describe("Menu Management work and details views", () => {
	it("starts in the work view with price, stock controls, refill, and a truncated description", () => {
		render(<MenuProductCard product={product()} {...callbacks()} />);
		expect(screen.getByText("$3.50")).toBeTruthy();
		expect((screen.getByRole("textbox", { name: "Chocolate Chip quantity" }) as HTMLInputElement).value).toBe("12");
		expect(screen.getByRole("button", { name: "Remove one Chocolate Chip" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Add one Chocolate Chip" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Refill" })).toBeTruthy();
		expect(screen.getByText(product().description).className).toContain("line-clamp-1");
		expect(screen.getByRole("button", { name: "Show details for Chocolate Chip" }).getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.queryByText("82 sold · 31 demand signals")).toBeNull();
		expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
	});

	it("expands with the keyboard and reveals the photo, full details, Edit, and Archive", async () => {
		const user = userEvent.setup();
		const actions = callbacks();
		render(<MenuProductCard product={product()} {...actions} />);
		const toggle = screen.getByRole("button", { name: "Show details for Chocolate Chip" });
		toggle.focus();
		await user.keyboard("{Enter}");

		expect(toggle.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("img", { name: "Chocolate Chip" }).getAttribute("src")).toBe("/img/cookie.webp");
		expect(screen.getByText(product().description).className).not.toContain("line-clamp-1");
		expect(screen.getByText("Maximum per order: 6")).toBeTruthy();
		expect(screen.getByText("82 sold · 31 demand signals")).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Edit" }));
		await user.click(screen.getByRole("button", { name: "Archive" }));
		expect(actions.onEdit).toHaveBeenCalledOnce();
		expect(actions.onArchive).toHaveBeenCalledOnce();

		await user.click(screen.getByRole("button", { name: "Hide details for Chocolate Chip" }));
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.getByRole("textbox", { name: "Chocolate Chip quantity" })).toBeTruthy();
	});

	it("expands cards independently and keeps an unfinished refill when details are toggled", async () => {
		const user = userEvent.setup();
		render(<><MenuProductCard product={product()} {...callbacks()} /><MenuProductCard product={product("oatmeal")} {...callbacks()} /></>);
		const card = screen.getByRole("heading", { name: "Chocolate Chip" }).closest("article")!;
		await user.click(within(card).getByRole("button", { name: "Refill" }));
		const amount = within(card).getByRole("textbox", { name: "Refill amount for Chocolate Chip" }) as HTMLInputElement;
		await user.type(amount, "24");
		await user.click(within(card).getByRole("button", { name: "Show details for Chocolate Chip" }));
		expect(screen.getByRole("button", { name: "Show details for Oatmeal" }).getAttribute("aria-expanded")).toBe("false");
		await user.click(within(card).getByRole("button", { name: "Hide details for Chocolate Chip" }));
		expect(amount.value).toBe("24");
	});

	it("keeps saving feedback and errors visible in the collapsed view", () => {
		render(<MenuProductCard product={product()} {...callbacks()} pending={1} error="Quantity could not be saved." />);
		expect(screen.getByRole("status").textContent).toContain("Updating");
		expect(screen.getByRole("alert").textContent).toBe("Quantity could not be saved.");
		expect((screen.getByRole("textbox", { name: "Chocolate Chip quantity" }) as HTMLInputElement).disabled).toBe(true);
	});

	it("keeps Restore in the collapsed Past Flavor view and offers editing when expanded", async () => {
		const user = userEvent.setup();
		const onRestore = vi.fn();
		const onEdit = vi.fn();
		render(<PastFlavorCard product={{ ...product(), isArchived: true }} onRestore={onRestore} onEdit={onEdit} />);
		expect(screen.queryByRole("textbox", { name: "Chocolate Chip quantity" })).toBeNull();
		expect(screen.queryByRole("img")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Restore" }));
		expect(onRestore).toHaveBeenCalledOnce();
		await user.click(screen.getByRole("button", { name: "Show details for Chocolate Chip" }));
		expect(screen.getByRole("img", { name: "Chocolate Chip" })).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Edit" }));
		expect(onEdit).toHaveBeenCalledOnce();
	});
});
