import { describe, expect, it, vi } from "vitest";
import { saveProductWithOptionalImage } from "./productImageWorkflow";

const existing = { id: "p1", image: "old-image" };
const created = { id: "p2", image: null };

describe("product image workflow", () => {
	it("does not overwrite an existing image reference when upload fails", async () => {
		const result = await saveProductWithOptionalImage({
			existingProduct: existing,
			selectedFile: {} as File,
			saveProduct: vi.fn().mockResolvedValue(existing),
			uploadImage: vi.fn().mockRejectedValue(new Error("upload failed")),
		});
		expect(result.product.image).toBe("old-image");
		expect(result.imageError).toBe("upload failed");
	});

	it("keeps a new product when its subsequent image upload fails", async () => {
		const result = await saveProductWithOptionalImage({
			existingProduct: null,
			selectedFile: {} as File,
			saveProduct: vi.fn().mockResolvedValue(created),
			uploadImage: vi.fn().mockRejectedValue(new Error("upload failed")),
		});
		expect(result).toEqual({ product: created, imageError: "upload failed", productWasCreated: true });
	});

	it("can retry against the already-created product without creating it again", async () => {
		const saveProduct = vi.fn();
		const uploadImage = vi.fn().mockResolvedValue({ ...created, image: "new-image" });
		const result = await saveProductWithOptionalImage({
			existingProduct: created,
			selectedFile: {} as File,
			skipProductSave: true,
			saveProduct,
			uploadImage,
		});
		expect(saveProduct).not.toHaveBeenCalled();
		expect(uploadImage).toHaveBeenCalledWith(created, expect.anything());
		expect(result.product.image).toBe("new-image");
	});
});
