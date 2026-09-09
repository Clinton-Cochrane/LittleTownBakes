import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/orders/[id]", () => {
	it("keeps legacy internal-ID tracking links disabled", async () => {
		const response = await GET();

		expect(response.status).toBe(404);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.text()).toBe("Not Found");
	});
});
