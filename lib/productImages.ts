import { randomBytes } from "node:crypto";
import {
	MAX_PRODUCT_IMAGE_BYTES,
	PRODUCT_IMAGE_BUCKET,
	PRODUCT_IMAGE_EXTENSIONS,
	ProductImageError,
	validateProductImage,
} from "./productImageRules";

export { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_BUCKET, ProductImageError, validateProductImage };

function safeSegment(value: string, fallback: string) {
	const segment = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60)
		.replace(/-+$/g, "");
	return segment || fallback;
}

export function createProductImagePath(
	productId: string,
	productName: string,
	mimeType: keyof typeof PRODUCT_IMAGE_EXTENSIONS,
	createSuffix: () => string = () => randomBytes(3).toString("hex"),
) {
	const extension = PRODUCT_IMAGE_EXTENSIONS[mimeType];
	return `products/${safeSegment(productId, "product")}/${safeSegment(productName, "product")}-${createSuffix()}.${extension}`;
}

export function isProductImagePathForProduct(objectPath: string, productId: string) {
	const productSegment = safeSegment(productId, "product");
	return new RegExp(`^products/${productSegment}/[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{6}\\.(?:jpg|png|webp|gif)$`).test(objectPath);
}

export function getManagedProductImagePath(imageReference: string | null, supabaseUrl: string) {
	if (!imageReference) return null;
	const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
	if (!imageReference.startsWith(prefix)) return null;
	const objectPath = imageReference.slice(prefix.length);
	return /^products\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|png|webp|gif)$/.test(objectPath)
		? objectPath
		: null;
}

type ReplacementInput<T> = {
	productId: string;
	newObjectPath: string;
	oldImage: string | null;
	publicUrl: string;
	updateReference: (publicUrl: string) => Promise<T>;
	removeObject: (objectPath: string) => Promise<void>;
	getOldManagedPath: (imageReference: string | null) => string | null;
};

export async function replaceProductImageReference<T>(input: ReplacementInput<T>) {
	let updated: T;
	try {
		updated = await input.updateReference(input.publicUrl);
	} catch (error) {
		try {
			await input.removeObject(input.newObjectPath);
		} catch (cleanupError) {
			console.error("[product image] orphan cleanup failed", {
				stage: "database-update-failed",
				productId: input.productId,
				objectPath: input.newObjectPath,
				error: cleanupError,
			});
		}
		throw error;
	}

	const oldObjectPath = input.getOldManagedPath(input.oldImage);
	if (oldObjectPath && oldObjectPath !== input.newObjectPath) {
		try {
			await input.removeObject(oldObjectPath);
		} catch (error) {
			console.error("[product image] replaced-object cleanup failed", {
				stage: "old-object-cleanup",
				productId: input.productId,
				objectPath: oldObjectPath,
				error,
			});
		}
	}
	return updated;
}

function storageFailure(stage: string, context: Record<string, unknown>, error: unknown): never {
	console.error(`[product image] ${stage} failed`, { stage, ...context, error });
	throw new ProductImageError(500, "Product photo operation failed. Please try again.");
}

async function requireProduct(productId: string) {
	const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
	const { data, error } = await getSupabaseAdmin()
		.from("products")
		.select("id, name, image")
		.eq("id", productId)
		.maybeSingle();
	if (error) storageFailure("product-lookup", { productId }, error);
	if (!data) throw new ProductImageError(404, "Product not found.");
	return data as { id: string; name: string; image: string | null };
}

export async function initiateProductImageUpload(productId: string, input: { mimeType: unknown; fileSize: unknown }) {
	const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
	const extension = validateProductImage(input);
	const product = await requireProduct(productId);
	const objectPath = createProductImagePath(product.id, product.name, input.mimeType as keyof typeof PRODUCT_IMAGE_EXTENSIONS);
	const { data, error } = await getSupabaseAdmin()
		.storage.from(PRODUCT_IMAGE_BUCKET)
		.createSignedUploadUrl(objectPath, { upsert: false });
	if (error || !data) storageFailure("create-signed-upload", {
		productId,
		objectPath,
		mimeType: input.mimeType,
		fileSize: input.fileSize,
		extension,
	}, error);
	return { bucket: PRODUCT_IMAGE_BUCKET, objectPath, token: data.token };
}

export async function finalizeProductImage(productId: string, input: { objectPath: unknown; mimeType: unknown; fileSize: unknown }) {
	const [{ getSupabaseAdmin }, { updateProduct }, { getPublicSupabaseConfig }] = await Promise.all([
		import("@/lib/supabaseAdmin"),
		import("@/lib/adminCatalog"),
		import("@/lib/supabase/config"),
	]);
	validateProductImage(input);
	if (typeof input.objectPath !== "string" || !isProductImagePathForProduct(input.objectPath, productId)) {
		throw new ProductImageError(400, "Invalid product photo path.");
	}

	const product = await requireProduct(productId);
	const storage = getSupabaseAdmin().storage.from(PRODUCT_IMAGE_BUCKET);
	const { data: fileInfo, error: infoError } = await storage.info(input.objectPath);
	if (infoError || !fileInfo) storageFailure("verify-upload", {
		productId,
		objectPath: input.objectPath,
		mimeType: input.mimeType,
		fileSize: input.fileSize,
	}, infoError);
	if (fileInfo.contentType !== input.mimeType || fileInfo.size !== input.fileSize) {
		try {
			await storage.remove([input.objectPath]);
		} catch {
			// The mismatch is the primary failure; orphan cleanup is best effort.
		}
		throw new ProductImageError(400, "Uploaded photo details did not match the selected file.");
	}

	const publicUrl = storage.getPublicUrl(input.objectPath).data.publicUrl;
	const { url } = getPublicSupabaseConfig();
	return replaceProductImageReference({
		productId,
		newObjectPath: input.objectPath,
		oldImage: product.image,
		publicUrl,
		updateReference: (image) => updateProduct(productId, { image }),
		removeObject: async (objectPath) => {
			const { error } = await storage.remove([objectPath]);
			if (error) throw error;
		},
		getOldManagedPath: (image) => getManagedProductImagePath(image, url),
	});
}
