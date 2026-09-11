import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
	DM_Sans: () => ({ variable: "font-body" }),
	Fraunces: () => ({ variable: "font-display" }),
}));

import { metadata } from "./layout";

describe("site metadata", () => {
	it("uses the Little Town Bakes launch identity and owner-supplied favicon path", () => {
		expect(metadata.title).toEqual({
			default: "Little Town Bakes",
			template: "%s | Little Town Bakes",
		});
		expect(metadata.description).toContain("Fresh from our hearth to your home.");
		expect(metadata.icons).toEqual({ icon: "/brand/favicon.ico" });
	});
});
