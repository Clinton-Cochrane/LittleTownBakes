import { describe, expect, it } from "vitest";
import { isLocalMode } from "./localMode";

describe("isLocalMode", () => {
	it("requires the explicit JSON data source outside production", () => {
		expect(isLocalMode({ NODE_ENV: "development", LOCAL_DATA_SOURCE: "json" })).toBe(true);
		expect(isLocalMode({ NODE_ENV: "development" })).toBe(false);
	});

	it("cannot be enabled in production", () => {
		expect(isLocalMode({ NODE_ENV: "production", LOCAL_DATA_SOURCE: "json" })).toBe(false);
	});
});
