import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import AboutPage from "./page";

describe("About route", () => {
	it("redirects to Home", () => {
		AboutPage();
		expect(redirect).toHaveBeenCalledWith("/");
	});
});
