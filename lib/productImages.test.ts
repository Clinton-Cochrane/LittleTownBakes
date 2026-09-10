import { describe, expect, it, vi } from "vitest";
import {
	MAX_PRODUCT_IMAGE_BYTES,
	PRODUCT_IMAGE_BUCKET,
	ProductImageError,
	createProductImagePath,
	getManagedProductImagePath,
	replaceProductImageReference,
	validateProductImage,
} from "./productImages";

describe("product image validation and naming", () => {
	it.each([
		["image/jpeg", "jpg"],
		["image/png", "png"],
		["image/webp", "webp"],
		["image/gif", "gif"],
	])("accepts %s", (mimeType, extension) => {
		expect(validateProductImage({ mimeType, fileSize: 1024 })).toBe(extension);
	});

	it("rejects unsupported MIME types", () => {
		expect(() => validateProductImage({ mimeType: "image/svg+xml", fileSize: 100 })).toThrowError(ProductImageError);
	});

	it("rejects files over exactly 15 MiB", () => {
		expect(() => validateProductImage({ mimeType: "image/jpeg", fileSize: MAX_PRODUCT_IMAGE_BYTES + 1 }))
			.toThrow("15 MB or smaller");
		expect(validateProductImage({ mimeType: "image/jpeg", fileSize: MAX_PRODUCT_IMAGE_BYTES })).toBe("jpg");
	});

	it("generates safe unique paths with a readable server slug", () => {
		const first = createProductImagePath("product/id", " Crème brûlée ../ Cookie! ", "image/webp", () => "a3f91c");
		const second = createProductImagePath("product/id", " Crème brûlée ../ Cookie! ", "image/webp", () => "b4e82d");

		expect(first).toBe("products/product-id/creme-brulee-cookie-a3f91c.webp");
		expect(second).not.toBe(first);
		expect(first).toMatch(/^products\/[a-z0-9-]+\/[a-z0-9-]+-[a-f0-9]{6}\.webp$/);
	});

	it("only recognizes public URLs owned by the managed bucket", () => {
		const baseUrl = "https://bakery.supabase.co";
		expect(getManagedProductImagePath(
			`${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/products/p1/cake-a3f91c.jpg`,
			baseUrl,
		)).toBe("products/p1/cake-a3f91c.jpg");
		expect(getManagedProductImagePath("/img/cake.png", baseUrl)).toBeNull();
		expect(getManagedProductImagePath("https://example.com/cake.png", baseUrl)).toBeNull();
	});
});

describe("product image replacement", () => {
	it("cleans up a new orphan when the database update fails", async () => {
		const removeObject = vi.fn().mockResolvedValue(undefined);
		await expect(replaceProductImageReference({
			productId: "p1",
			newObjectPath: "products/p1/cake-a3f91c.jpg",
			oldImage: "/img/cake.png",
			publicUrl: "https://bakery.supabase.co/storage/v1/object/public/product-images/products/p1/cake-a3f91c.jpg",
			updateReference: vi.fn().mockRejectedValue(new Error("database unavailable")),
			removeObject,
			getOldManagedPath: () => null,
		})).rejects.toThrow("database unavailable");
		expect(removeObject).toHaveBeenCalledWith("products/p1/cake-a3f91c.jpg");
	});

	it("keeps a successful replacement when old-object cleanup fails", async () => {
		const updated = { id: "p1", image: "new-url" };
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const result = await replaceProductImageReference({
			productId: "p1",
			newObjectPath: "products/p1/new-a3f91c.png",
			oldImage: "old-url",
			publicUrl: "new-url",
			updateReference: vi.fn().mockResolvedValue(updated),
			removeObject: vi.fn().mockRejectedValue(new Error("storage unavailable")),
			getOldManagedPath: () => "products/p1/old-b4e82d.png",
		});

		expect(result).toBe(updated);
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("never sends a legacy static image to Storage deletion", async () => {
		const removeObject = vi.fn();
		await replaceProductImageReference({
			productId: "p1",
			newObjectPath: "products/p1/new-a3f91c.gif",
			oldImage: "/img/animated.gif",
			publicUrl: "new-url",
			updateReference: vi.fn().mockResolvedValue({ id: "p1", image: "new-url" }),
			removeObject,
			getOldManagedPath: () => null,
		});
		expect(removeObject).not.toHaveBeenCalled();
	});
});
