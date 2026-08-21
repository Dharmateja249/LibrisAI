"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { VOICE_OPTIONS } from "@/lib/constants";
import LoadingOverlay, { LoadingStep } from "@/components/LoadingOverlay";
import { checkBookExists, createBook } from "@/lib/actions/book.actions";
import { renderPdfFirstPage, extractPdfTextAndSegments } from "@/lib/pdf-parser";

const AddBookForm = () => {
    const router = useRouter();

    // Form state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isAutoCover, setIsAutoCover] = useState(false);
    const [isExtractingCover, setIsExtractingCover] = useState(false);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [selectedVoice, setSelectedVoice] = useState("priya");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [existingBookSlug, setExistingBookSlug] = useState<string | null>(null);
    const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
        { label: "Validating book & checking duplicates…", status: "pending" },
        { label: "Parsing PDF & extracting text content…", status: "pending" },
        { label: "Analysing chapters & generating AI model…", status: "pending" },
        { label: "Saving book & preparing voice assistant…", status: "pending" },
    ]);

    // Drag-over states
    const [isPdfDragOver, setIsPdfDragOver] = useState(false);
    const [isCoverDragOver, setIsCoverDragOver] = useState(false);

    // Refs for hidden inputs
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const coverPreviewRef = useRef<string | null>(null);

    const updateCover = (file: File | null) => {
        if (coverPreviewRef.current && !coverPreviewRef.current.startsWith("data:")) {
            URL.revokeObjectURL(coverPreviewRef.current);
            coverPreviewRef.current = null;
        }

        setCoverFile(file);
        setIsAutoCover(false);

        if (file) {
            const url = URL.createObjectURL(file);
            coverPreviewRef.current = url;
            setCoverPreview(url);
        } else {
            setCoverPreview(null);
        }
    };

    // Auto-extract first page of PDF as cover preview if user has not uploaded a custom cover
    const autoGenerateCoverFromPdf = async (file: File) => {
        if (coverFile) return; // Keep user's custom cover if present
        try {
            setIsExtractingCover(true);
            const dataUrl = await renderPdfFirstPage(file);
            setCoverPreview(dataUrl);
            setIsAutoCover(true);
        } catch (e) {
            console.warn("Could not preview first page:", e);
        } finally {
            setIsExtractingCover(false);
        }
    };

    // Manage cover preview object URL lifecycle
    useEffect(() => {
        return () => {
            if (coverPreviewRef.current && !coverPreviewRef.current.startsWith("data:")) {
                URL.revokeObjectURL(coverPreviewRef.current);
            }
        };
    }, []);

    // Handle PDF selection
    const handlePdfSelect = async (file: File) => {
        if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
            setErrorMessage("Please upload a valid PDF file.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setErrorMessage("PDF file size must be less than 50MB.");
            return;
        }
        setErrorMessage(null);
        setExistingBookSlug(null);
        setPdfFile(file);

        // Auto-fill title if empty
        if (!title) {
            const inferredTitle = file.name
                .replace(/\.[^/.]+$/, "")
                .replace(/[-_]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
            setTitle(inferredTitle);
        }

        // Render first page as cover
        await autoGenerateCoverFromPdf(file);
    };

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handlePdfSelect(file);
    };

    const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsPdfDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePdfSelect(file);
    };

    const removePdf = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPdfFile(null);
        if (isAutoCover) {
            setCoverPreview(null);
            setIsAutoCover(false);
        }
        if (pdfInputRef.current) pdfInputRef.current.value = "";
    };

    // Handle Cover Image selection
    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setErrorMessage("Please upload a valid image file for the cover.");
                return;
            }
            setErrorMessage(null);
            updateCover(file);
        }
    };

    const handleCoverDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsCoverDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setErrorMessage("Please upload a valid image file for the cover.");
                return;
            }
            setErrorMessage(null);
            updateCover(file);
        }
    };

    const removeCover = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateCover(null);
        if (coverInputRef.current) coverInputRef.current.value = "";
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pdfFile) {
            setErrorMessage("Please upload a PDF file to proceed.");
            return;
        }

        if (!title.trim()) {
            setErrorMessage("Please enter a title for the book.");
            return;
        }

        if (!author.trim()) {
            setErrorMessage("Please enter the author's name.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);
        setExistingBookSlug(null);

        const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

        try {
            // STEP 1: Duplicate check & validation
            setLoadingSteps((prev) =>
                prev.map((s, i) => (i === 0 ? { ...s, status: "active" as const } : s))
            );

            const duplicateCheck = await checkBookExists(title.trim(), author.trim());
            if (duplicateCheck.exists && duplicateCheck.book) {
                setExistingBookSlug(duplicateCheck.book.slug);
                throw new Error(
                    `A book titled "${title.trim()}" already exists in your library. Duplicate upload prevented.`
                );
            }

            await wait(400);
            setLoadingSteps((prev) =>
                prev.map((s, i) => (i === 0 ? { ...s, status: "done" as const } : i === 1 ? { ...s, status: "active" as const } : s))
            );

            // STEP 2: PDF Parsing & Readable Text Validation
            const parsed = await extractPdfTextAndSegments(pdfFile, title.trim(), author.trim());

            if (parsed.totalWords < 30) {
                throw new Error(
                    "This PDF contains no readable text. Please upload a different file or a text-searchable document."
                );
            }

            await wait(500);
            setLoadingSteps((prev) =>
                prev.map((s, i) => (i <= 1 ? { ...s, status: "done" as const } : i === 2 ? { ...s, status: "active" as const } : s))
            );

            // STEP 3: Determine Cover & Structure Segments
            let finalCover = coverPreview;
            if (!finalCover && parsed.coverDataUrl) {
                finalCover = parsed.coverDataUrl;
            }

            // STEP 4: Persist Book + Segments to MongoDB
            const res = await createBook({
                title: title.trim(),
                author: author.trim(),
                voice: selectedVoice,
                fileSize: pdfFile.size,
                pagesCount: parsed.totalPages,
                coverURL: finalCover || undefined,
                segments: parsed.segments,
                summary:
                    parsed.segments[0]?.summary ||
                    `Interactive AI synthesis and concept breakdown for "${title.trim()}" by ${author.trim()}.`,
            });

            if (!res.success) {
                if (res.isDuplicate && res.existingSlug) {
                    setExistingBookSlug(res.existingSlug);
                }
                throw new Error(res.error || "Failed to save book to database.");
            }

            setLoadingSteps((prev) =>
                prev.map((s, i) => (i <= 2 ? { ...s, status: "done" as const } : { ...s, status: "active" as const }))
            );

            // STEP 5: Prepare AI Voice Assistant
            await wait(600);
            setLoadingSteps((prev) =>
                prev.map((s) => ({ ...s, status: "done" as const }))
            );

            await wait(400);
            const destination = res.book?.slug ? `/books/${res.book.slug}` : "/";
            router.push(destination);
            router.refresh();
        } catch (err: unknown) {
            console.error("Upload failed:", err);
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while processing your PDF. Please upload a different file."
            );
            setIsSubmitting(false);
        }
    };

    const maleVoices = VOICE_OPTIONS.filter((v) => v.gender === "male");
    const femaleVoices = VOICE_OPTIONS.filter((v) => v.gender === "female");

    return (
        <>
            {isSubmitting && <LoadingOverlay steps={loadingSteps} />}

            <div className="new-book-wrapper">
                {/* Header info */}
                <div className="text-left mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] font-serif leading-tight">
                        Upload a PDF to generate your interactive interview
                    </h1>
                    <p className="text-sm md:text-base text-[var(--text-secondary)] mt-2">
                        PDFs are automatically validated, chapter-parsed, and configured for AI voice discussions.
                    </p>
                </div>

                {/* Error Banner with duplicate action button */}
                {errorMessage && (
                    <div className="error-banner mb-6">
                        <div className="error-banner-content">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="error-banner-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-sm font-medium text-red-800">
                                    {errorMessage}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {existingBookSlug && (
                                    <Link
                                        href={`/books/${existingBookSlug}`}
                                        className="px-3 py-1 bg-red-800 text-white rounded text-xs font-medium hover:bg-red-900 transition-colors"
                                    >
                                        View Existing Book
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setErrorMessage(null);
                                        setExistingBookSlug(null);
                                    }}
                                    className="error-banner-dismiss text-xs"
                                    aria-label="Dismiss error"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    {/* Hidden inputs */}
                    <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfChange}
                        className="hidden"
                        id="pdf-file-input"
                        aria-label="Upload PDF File"
                    />
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                        id="cover-file-input"
                        aria-label="Upload Cover Image"
                    />

                    {/* PDF Upload Dropzone */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Book PDF <span className="text-red-500">*</span>
                        </label>

                        {pdfFile ? (
                            <div className="file-preview-card">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                                        <svg
                                            className="w-5 h-5 text-red-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {pdfFile.name}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {formatFileSize(pdfFile.size)} • PDF Ready for AI Synthesis
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removePdf}
                                    className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    aria-label="Remove PDF"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => pdfInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsPdfDragOver(true);
                                }}
                                onDragLeave={() => setIsPdfDragOver(false)}
                                onDrop={handlePdfDrop}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && pdfInputRef.current?.click()}
                                className={`dropzone-base ${
                                    isPdfDragOver
                                        ? "dropzone-active"
                                        : "border-[var(--border-subtle)] hover:border-[#663820]/40 bg-[var(--bg-secondary)]/40"
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-3">
                                    <svg
                                        className="w-6 h-6 text-[#663820]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                                    Click to upload or drag & drop your PDF
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Supports PDF up to 50MB (page 1 automatically generated as cover)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Cover Image Upload & First-Page Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-[var(--text-primary)]">
                                Cover Image
                            </label>
                            {isAutoCover && (
                                <span className="text-xs text-[#663820] font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Auto-generated from Page 1
                                </span>
                            )}
                        </div>

                        {coverPreview ? (
                            <div className="file-preview-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-16 relative rounded overflow-hidden shrink-0 border border-[var(--border-subtle)] bg-white shadow-soft-xs">
                                        <Image
                                            src={coverPreview}
                                            alt="Cover preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {coverFile ? coverFile.name : "Page 1 Cover Preview"}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {coverFile ? formatFileSize(coverFile.size) : "Rendered from uploaded PDF"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        className="text-xs text-[#663820] hover:underline font-medium"
                                    >
                                        Change
                                    </button>
                                    <button
                                        type="button"
                                        onClick={removeCover}
                                        className="p-1.5 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                        aria-label="Remove cover"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => coverInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsCoverDragOver(true);
                                }}
                                onDragLeave={() => setIsCoverDragOver(false)}
                                onDrop={handleCoverDrop}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && coverInputRef.current?.click()}
                                className={`dropzone-base !py-4 ${
                                    isCoverDragOver
                                        ? "dropzone-active"
                                        : "border-[var(--border-subtle)] hover:border-[#663820]/40 bg-[var(--bg-secondary)]/40"
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <svg
                                        className="w-5 h-5 text-[var(--text-muted)]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        Upload custom cover
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        (optional - auto-extracted from PDF page 1 if omitted)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Book Metadata Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="book-title-input"
                                className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                            >
                                Book Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="book-title-input"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Atomic Habits"
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#212a3b]"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="book-author-input"
                                className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                            >
                                Author <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="book-author-input"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="e.g. James Clear"
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#212a3b]"
                                required
                            />
                        </div>
                    </div>

                    {/* Voice Assistant Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Select AI Voice Assistant
                        </label>

                        {/* Male Voices */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                Male Voices
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {maleVoices.map((voice) => {
                                    const isSelected = selectedVoice === voice.id;
                                    return (
                                        <button
                                            key={voice.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#fff6e5] border-[#212a3b] shadow-soft-sm ring-1 ring-[#212a3b]"
                                                    : "bg-white border-[var(--border-subtle)] hover:bg-[#faf6ee] shadow-soft-sm"
                                            }`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                                    isSelected
                                                        ? "border-[#212a3b] bg-[#212a3b]"
                                                        : "border-[var(--text-muted)] bg-transparent"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                                                )}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--text-primary)] leading-none mb-1">
                                                    {voice.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)] leading-tight line-clamp-2">
                                                    {voice.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Female Voices */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                                Female Voices
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {femaleVoices.map((voice) => {
                                    const isSelected = selectedVoice === voice.id;
                                    return (
                                        <button
                                            key={voice.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={`flex items-start gap-3 p-4 rounded-xl text-left border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#fff6e5] border-[#212a3b] shadow-soft-sm ring-1 ring-[#212a3b]"
                                                    : "bg-white border-[var(--border-subtle)] hover:bg-[#faf6ee] shadow-soft-sm"
                                            }`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                                    isSelected
                                                        ? "border-[#212a3b] bg-[#212a3b]"
                                                        : "border-[var(--text-muted)] bg-transparent"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                                                )}
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--text-primary)] leading-none mb-1">
                                                    {voice.name}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)] leading-tight">
                                                    {voice.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                        <Link
                            href="/"
                            className="px-5 py-2.5 rounded-full text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            id="synthesise-book-btn"
                            disabled={isSubmitting || !pdfFile}
                            className={`library-cta-primary !w-fit !px-7 !py-3 !text-sm flex items-center gap-2 ${
                                isSubmitting || !pdfFile ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        >
                            <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                            <span>Synthesise & Save Book</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default AddBookForm;
