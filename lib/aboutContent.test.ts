import { describe, expect, it } from "vitest";
import { getAboutContent } from "./aboutContent";

describe("about content", () => {
	it("provides complete, Oakley-specific launch copy", async () => {
		const content = await getAboutContent();

		expect(content.about.story).toContain("Oakley");
		expect(content.about.howWeBake).not.toBe("");
		expect(content.about.whoWeAre).not.toBe("");
		expect(content.about.values).not.toBe("");
		expect(content.howToOrder.intro).not.toBe("");
		expect(content.howToOrder.steps).toHaveLength(3);
		expect(content.howToOrder.pickupLocation).toContain("Oakley");
		expect(content.howToOrder.leadTime).not.toBe("");
		expect(content.howToOrder.payment).not.toBe("");
		expect(content.contact.email).not.toBe("");
		expect(content.contact.instagram).not.toBe("");
	});
});
