import { createClient } from "@/lib/supabase/client";
import {
	MAX_PRODUCT_IMAGE_BYTES,
	MAX_PRODUCT_IMAGE_DIMENSION,
	PRODUCT_IMAGE_BUCKET,
	ProductImageError,
	validateProductImage,
} from "./productImageRules";
import type { AdminMenuProduct } from "./adminMenu";

type ImageDecoder = (file: File) => Promise<ImageBitmap>;

export function calculateContainedDimensions(width: number, height: number) {
	const longest = Math.max(width, height);
	if (longest <= MAX_PRODUCT_IMAGE_DIMENSION) return { width, height };
	const scale = MAX_PRODUCT_IMAGE_DIMENSION / longest;
	return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => blob ? resolve(blob) : reject(new Error("The browser could not prepare this photo.")),
			mimeType,
			mimeType === "image/jpeg" || mimeType === "image/webp" ? 0.86 : undefined,
		);
	});
}

export async function prepareProductImage(file: File, decode: ImageDecoder = createImageBitmap) {
	validateProductImage({ mimeType: file.type, fileSize: file.size });
	if (file.type === "image/gif") return file;

	const bitmap = await decode(file);
	try {
		const dimensions = calculateContainedDimensions(bitmap.width, bitmap.height);
		if (dimensions.width === bitmap.width && dimensions.height === bitmap.height) return file;
		const canvas = document.createElement("canvas");
		canvas.width = dimensions.width;
		canvas.height = dimensions.height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("The browser could not prepare this photo.");
		context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
		const blob = await canvasBlob(canvas, file.type);
		return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
	} finally {
		bitmap.close();
	}
}

async function responseMessage(response: Response, fallback: string) {
	const body = await response.json().catch(() => ({}));
	return (body as { error?: string }).error ?? fallback;
}

export async function uploadProductImage(
	product: AdminMenuProduct,
	file: File,
	onStage?: (stage: "preparing" | "uploading" | "finalizing") => void,
) {
	let preparedFile: File;
	try {
		onStage?.("preparing");
		preparedFile = await prepareProductImage(file);
	} catch (error) {
		console.error("[product image] browser preparation failed", {
			stage: "preparing",
			productId: product.id,
			mimeType: file.type,
			fileSize: file.size,
			error,
		});
		throw error;
	}

	let objectPath: string | undefined;
	try {
		const uploadCapability = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/image-upload`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mimeType: preparedFile.type, fileSize: preparedFile.size }),
		});
		if (!uploadCapability.ok) throw new Error(await responseMessage(uploadCapability, "Photo upload could not be started."));
		const capability = await uploadCapability.json() as { bucket: string; objectPath: string; token: string };
		objectPath = capability.objectPath;

		onStage?.("uploading");
		const { error: uploadError } = await createClient().storage
			.from(capability.bucket || PRODUCT_IMAGE_BUCKET)
			.uploadToSignedUrl(capability.objectPath, capability.token, preparedFile, {
				contentType: preparedFile.type,
				cacheControl: "3600",
			});
		if (uploadError) throw uploadError;

		onStage?.("finalizing");
		const finalize = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/image`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ objectPath, mimeType: preparedFile.type, fileSize: preparedFile.size }),
		});
		if (!finalize.ok) throw new Error(await responseMessage(finalize, "Photo could not be attached to the product."));
		return await finalize.json() as AdminMenuProduct;
	} catch (error) {
		console.error("[product image] browser upload failed", {
			stage: objectPath ? "upload-or-finalize" : "initiate",
			productId: product.id,
			objectPath,
			mimeType: preparedFile.type,
			fileSize: preparedFile.size,
			error,
		});
		throw error instanceof ProductImageError ? error : new Error(error instanceof Error ? error.message : "Photo upload failed. Please try again.");
	}
}

export function validateSelectedProductImage(file: File) {
	if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("Choose an image that is 15 MB or smaller.");
	validateProductImage({ mimeType: file.type, fileSize: file.size });
}
