import { describe, expect, it, vi } from "vitest";

const { preloadMenu } = vi.hoisted(() => ({ preloadMenu: vi.fn() }));
vi.mock("@/lib/menuLoader", () => ({ preloadMenu }));
vi.mock("react", () => ({
	useEffect: (effect: () => void) => effect(),
}));

import MenuPreloader from "./MenuPreloader";

describe("MenuPreloader", () => {
	it("starts loading without blocking Home rendering", () => {
		expect(MenuPreloader()).toBeNull();
		expect(preloadMenu).toHaveBeenCalledTimes(1);
	});
});
