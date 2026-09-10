type ProductWithImage = { id: string; image: string | null };

type WorkflowInput<T extends ProductWithImage> = {
	existingProduct: T | null;
	selectedFile: File | null;
	skipProductSave?: boolean;
	saveProduct: (existingProduct: T | null) => Promise<T>;
	uploadImage: (product: T, file: File) => Promise<T>;
};

export async function saveProductWithOptionalImage<T extends ProductWithImage>(input: WorkflowInput<T>) {
	const productWasCreated = input.existingProduct === null;
	const product = input.skipProductSave && input.existingProduct
		? input.existingProduct
		: await input.saveProduct(input.existingProduct);
	if (!input.selectedFile) return { product, productWasCreated };
	try {
		return { product: await input.uploadImage(product, input.selectedFile), productWasCreated };
	} catch (error) {
		return {
			product,
			imageError: error instanceof Error ? error.message : "Photo upload failed. Please try again.",
			productWasCreated,
		};
	}
}
