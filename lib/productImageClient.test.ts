import { describe, expect, it, vi } from "vitest";
import { calculateContainedDimensions, prepareProductImage } from "./productImageClient";

describe("product image preprocessing", () => {
	it("preserves aspect ratio and caps the longest dimension at 1600", () => {
		expect(calculateContainedDimensions(4032, 3024)).toEqual({ width: 1600, height: 1200 });
		expect(calculateContainedDimensions(900, 1200)).toEqual({ width: 900, height: 1200 });
		expect(calculateContainedDimensions(1200, 2400)).toEqual({ width: 800, height: 1600 });
		expect(calculateContainedDimensions(4000, 4000)).not.toEqual({ width: 120, height: 120 });
	});

	it("returns GIF files unchanged so animation is preserved", async () => {
		const gif = new File(["GIF89a"], "animated.gif", { type: "image/gif" });
		const decoder = vi.fn();
		expect(await prepareProductImage(gif, decoder)).toBe(gif);
		expect(decoder).not.toHaveBeenCalled();
	});
});
