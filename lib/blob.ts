"use server";

import { put } from "@vercel/blob";

/**
 * Upload a File, Buffer, or Base64 Data URL to Vercel Blob.
 * If BLOB_READ_WRITE_TOKEN is not configured, provides a graceful fallback.
 */
export async function uploadToBlob(
    fileOrBuffer: File | Buffer | string,
    filename: string,
    contentType?: string
): Promise<{ url: string; fallback: boolean }> {
    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.warn(
                "BLOB_READ_WRITE_TOKEN is not configured in .env.local. Using fallback URL storage."
            );
            if (typeof fileOrBuffer === "string" && fileOrBuffer.startsWith("data:")) {
                return { url: fileOrBuffer, fallback: true };
            }
            return {
                url: `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800`,
                fallback: true,
            };
        }

        let bodyToUpload: Buffer | Blob | File = fileOrBuffer as File;

        if (typeof fileOrBuffer === "string") {
            if (fileOrBuffer.startsWith("data:")) {
                // Convert base64 data URL to Buffer
                const base64Data = fileOrBuffer.split(",")[1];
                bodyToUpload = Buffer.from(base64Data, "base64");
            } else {
                bodyToUpload = Buffer.from(fileOrBuffer, "utf-8");
            }
        }

        const safeFilename = `librisai/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        const blob = await put(safeFilename, bodyToUpload, {
            access: "public",
            contentType: contentType || (filename.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        });

        return { url: blob.url, fallback: false };
    } catch (error) {
        console.error("Vercel Blob upload failed:", error);
        if (typeof fileOrBuffer === "string" && fileOrBuffer.startsWith("data:")) {
            return { url: fileOrBuffer, fallback: true };
        }
        return {
            url: `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800`,
            fallback: true,
        };
    }
}
