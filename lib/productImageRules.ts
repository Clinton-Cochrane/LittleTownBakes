export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_DIMENSION = 1600;

export const PRODUCT_IMAGE_EXTENSIONS = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
} as const;

export type ProductImageMimeType = keyof typeof PRODUCT_IMAGE_EXTENSIONS;

export class ProductImageError extends Error {
	constructor(public readonly status: 400 | 404 | 500, message: string) {
		super(message);
		this.name = "ProductImageError";
	}
}

export function validateProductImage(input: { mimeType: unknown; fileSize: unknown }) {
	if (typeof input.mimeType !== "string" || !(input.mimeType in PRODUCT_IMAGE_EXTENSIONS)) {
		throw new ProductImageError(400, "Choose a JPEG, PNG, WebP, or GIF image.");
	}
	if (!Number.isSafeInteger(input.fileSize) || (input.fileSize as number) <= 0) {
		throw new ProductImageError(400, "The selected image is empty or has an invalid size.");
	}
	if ((input.fileSize as number) > MAX_PRODUCT_IMAGE_BYTES) {
		throw new ProductImageError(400, "Choose an image that is 15 MB or smaller.");
	}
	return PRODUCT_IMAGE_EXTENSIONS[input.mimeType as ProductImageMimeType];
}
