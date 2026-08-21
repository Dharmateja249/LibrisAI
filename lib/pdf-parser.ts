"use client";

import type { CreateBookSegmentInput } from "@/types";

/**
 * Configure PDF.js worker dynamically in browser environment
 */
async function getPdfJs() {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.js`;
    }
    return pdfjsLib;
}

export interface ParsedPdfResult {
    totalPages: number;
    totalWords: number;
    fullText: string;
    coverDataUrl: string;
    segments: CreateBookSegmentInput[];
}

/**
 * Renders the first page of a PDF file to an HTML5 canvas and outputs a high-res JPEG Data URL.
 */
export async function renderPdfFirstPage(file: File): Promise<string> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const firstPage = await pdfDoc.getPage(1);

    const scale = 2.0; // 2x resolution for crisp book cover
    const viewport = firstPage.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
        throw new Error("Canvas context is unavailable in this environment.");
    }

    // Fill white background before rendering
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await firstPage.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;

    return canvas.toDataURL("image/jpeg", 0.88);
}

/**
 * Parses full PDF text, validates readable content, extracts cover, and builds structured segments.
 */
export async function extractPdfTextAndSegments(
    file: File,
    bookTitle: string,
    bookAuthor: string
): Promise<ParsedPdfResult> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    if (totalPages === 0) {
        throw new Error("This PDF does not contain readable text. Please upload a different file.");
    }

    // 1. Render First Page as Cover Image
    let coverDataUrl = "";
    try {
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await firstPage.render({ canvasContext: ctx, viewport }).promise;
            coverDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        }
    } catch (e) {
        console.warn("Could not generate cover from page 1:", e);
    }

    // 2. Extract Text Page by Page
    const pageTexts: { pageNumber: number; text: string }[] = [];
    let fullText = "";

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        if (pageStr) {
            pageTexts.push({ pageNumber: i, text: pageStr });
            fullText += `\n\n--- Page ${i} ---\n` + pageStr;
        }
    }

    // 3. Validate Readable Text Content
    const words = fullText.match(/\b[A-Za-z0-9'-]+\b/g) || [];
    const totalWords = words.length;

    if (totalWords < 30) {
        throw new Error(
            "This PDF contains no readable text. Please upload a different file or a text-searchable document."
        );
    }

    // 4. Synthesize Structured Segments
    const segments: CreateBookSegmentInput[] = [];

    // Check if total pages is small or large
    const chunkSize = Math.max(1, Math.ceil(pageTexts.length / 4));
    let segmentIndex = 1;

    for (let i = 0; i < pageTexts.length; i += chunkSize) {
        const chunk = pageTexts.slice(i, i + chunkSize);
        const startPage = chunk[0].pageNumber;
        const endPage = chunk[chunk.length - 1].pageNumber;
        const chunkText = chunk.map((c) => c.text).join("\n\n");
        const chunkWords = (chunkText.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;

        let title = `Chapter ${segmentIndex}: Overview & Core Concepts`;
        if (segmentIndex === 1) {
            title = `Chapter 1: Foundations & Thesis of ${bookTitle}`;
        } else if (i + chunkSize >= pageTexts.length) {
            title = `Chapter ${segmentIndex}: Practical Applications & Conclusion`;
        } else {
            title = `Chapter ${segmentIndex}: Key Frameworks & Deep Dive Analysis`;
        }

        // Generate summary snippet (first ~300 chars)
        const summary =
            chunkText.length > 350
                ? chunkText.substring(0, 350).replace(/\s+/g, " ").trim() + "…"
                : chunkText;

        // Generate key takeaways
        const sentences = chunkText
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 25 && s.length < 150)
            .slice(0, 3);

        const keyTakeaways =
            sentences.length > 0
                ? sentences
                : [
                      `Core discussions and principles from pages ${startPage}-${endPage}`,
                      `Analysis and conceptual insights from ${bookAuthor}`,
                      "Key arguments and actionable conclusions for interactive interview",
                  ];

        segments.push({
            segmentNumber: segmentIndex,
            title,
            content: chunkText,
            summary,
            keyTakeaways,
            pageStart: startPage,
            pageEnd: endPage,
            wordCount: chunkWords,
            audioUrl: "",
        });

        segmentIndex++;
    }

    return {
        totalPages,
        totalWords,
        fullText,
        coverDataUrl,
        segments,
    };
}
