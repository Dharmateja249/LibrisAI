"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { VOICE_OPTIONS } from "@/lib/constants";
import LoadingOverlay, { LoadingStep } from "@/components/LoadingOverlay";

const AddBookForm = () => {

    // Form state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [selectedVoice, setSelectedVoice] = useState("priya");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
        { label: "Uploading PDF…", status: "pending" },
        { label: "Extracting text content…", status: "pending" },
        { label: "Analysing book structure…", status: "pending" },
        { label: "Preparing AI voice assistant…", status: "pending" },
    ]);

    // Drag-over states
    const [isPdfDragOver, setIsPdfDragOver] = useState(false);
    const [isCoverDragOver, setIsCoverDragOver] = useState(false);

    // Refs for hidden inputs
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Manage cover preview object URL lifecycle to prevent memory leaks
    useEffect(() => {
        if (!coverFile) {
            setCoverPreview(null);
            return;
        }

        const url = URL.createObjectURL(coverFile);
        setCoverPreview(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [coverFile]);

    // Handle PDF selection
    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
                setErrorMessage("Please upload a valid PDF file.");
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setErrorMessage("PDF file size must be less than 50MB.");
                return;
            }
            setErrorMessage(null);
            setPdfFile(file);

            // Auto-fill title if empty
            if (!title) {
                const inferredTitle = file.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[-_]/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                setTitle(inferredTitle);
            }
        }
    };

    const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsPdfDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
                setErrorMessage("Please upload a valid PDF file.");
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                setErrorMessage("PDF file size must be less than 50MB.");
                return;
            }
            setErrorMessage(null);
            setPdfFile(file);

            if (!title) {
                const inferredTitle = file.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[-_]/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                setTitle(inferredTitle);
            }
        }
    };

    const removePdf = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPdfFile(null);
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
            setCoverFile(file);
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
            setCoverFile(file);
        }
    };

    const removeCover = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCoverFile(null);
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

        // Real backend synthesis integration placeholder
        // Keeps user on the form and notifies that backend synthesis is currently unavailable
        setErrorMessage(
            "Book synthesis backend service is currently unavailable. Book creation will be enabled once backend processing is connected."
        );
        setIsSubmitting(false);
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
                        5 of 10 books used (
                        <Link
                            href="/subscriptions"
                            className="underline font-medium text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                        >
                            Upgrade
                        </Link>
                        )
                    </p>
                </div>

                {/* Error Banner */}
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
                            <button
                                type="button"
                                onClick={() => setErrorMessage(null)}
                                className="error-banner-dismiss text-xs"
                                aria-label="Dismiss error"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* 1. PDF File Upload */}
                    <div>
                        <label className="form-label" htmlFor="pdf-upload-input">
                            Book PDF File
                        </label>
                        <input
                            ref={pdfInputRef}
                            id="pdf-upload-input"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handlePdfChange}
                            className="hidden"
                        />

                        {!pdfFile ? (
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
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        pdfInputRef.current?.click();
                                    }
                                }}
                                className={`upload-dropzone border border-dashed ${
                                    isPdfDragOver
                                        ? "border-[#212a3b] bg-[#f8f4e9]"
                                        : "border-[var(--border-subtle)]"
                                } shadow-soft-sm`}
                            >
                                <svg
                                    className="upload-dropzone-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                    />
                                </svg>
                                <p className="upload-dropzone-text">Click to upload PDF</p>
                                <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
                            </div>
                        ) : (
                            <div className="upload-dropzone upload-dropzone-uploaded border border-[var(--border-subtle)] shadow-soft-sm relative px-6 py-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4 truncate">
                                    <div className="w-12 h-12 rounded-lg bg-[#663820] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
                                        PDF
                                    </div>
                                    <div className="truncate text-left">
                                        <p className="font-semibold text-[var(--text-primary)] truncate text-base">
                                            {pdfFile.name}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {formatFileSize(pdfFile.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removePdf}
                                    className="upload-dropzone-remove p-2 rounded-full hover:bg-white/60 transition-colors"
                                    aria-label="Remove PDF file"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Cover Image Upload (Optional) */}
                    <div>
                        <label className="form-label" htmlFor="cover-upload-input">
                            Cover Image (Optional)
                        </label>
                        <input
                            ref={coverInputRef}
                            id="cover-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                        />

                        {!coverPreview ? (
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
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        coverInputRef.current?.click();
                                    }
                                }}
                                className={`upload-dropzone border border-dashed ${
                                    isCoverDragOver
                                        ? "border-[#212a3b] bg-[#f8f4e9]"
                                        : "border-[var(--border-subtle)]"
                                } shadow-soft-sm`}
                            >
                                <svg
                                    className="upload-dropzone-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                                    />
                                </svg>
                                <p className="upload-dropzone-text">Click to upload cover image</p>
                                <p className="upload-dropzone-hint">
                                    Leave empty to auto-generate from PDF
                                </p>
                            </div>
                        ) : (
                            <div className="upload-dropzone upload-dropzone-uploaded border border-[var(--border-subtle)] shadow-soft-sm relative px-6 py-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4 truncate">
                                    <div className="relative w-12 h-16 rounded overflow-hidden shadow-sm shrink-0">
                                        <Image
                                            src={coverPreview}
                                            alt="Cover preview"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="truncate text-left">
                                        <p className="font-semibold text-[var(--text-primary)] truncate text-base">
                                            {coverFile?.name || "Uploaded cover"}
                                        </p>
                                        {coverFile && (
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatFileSize(coverFile.size)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeCover}
                                    className="upload-dropzone-remove p-2 rounded-full hover:bg-white/60 transition-colors"
                                    aria-label="Remove cover image"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 3. Title Input */}
                    <div>
                        <label className="form-label" htmlFor="book-title-input">
                            Title
                        </label>
                        <input
                            id="book-title-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ex: Rich Dad Poor Dad"
                            className="form-input border border-[var(--border-subtle)] shadow-soft-sm focus:border-[#212a3b] focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    {/* 4. Author Name Input */}
                    <div>
                        <label className="form-label" htmlFor="book-author-input">
                            Author Name
                        </label>
                        <input
                            id="book-author-input"
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="ex: Robert Kiyosaki"
                            className="form-input border border-[var(--border-subtle)] shadow-soft-sm focus:border-[#212a3b] focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    {/* 5. Voice Selector */}
                    <div>
                        <p className="form-label !mb-3">Choose Assistant Voice</p>

                        {/* Male Voices Group */}
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
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
                                            className={`flex items-start gap-3 p-4 rounded-xl text-left border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-[#fff6e5] border-[#212a3b] shadow-soft-sm ring-1 ring-[#212a3b]"
                                                    : "bg-white border-[var(--border-subtle)] hover:bg-[#faf6ee] shadow-soft-sm"
                                            }`}
                                        >
                                            <span
                                                className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                                    isSelected
                                                        ? "border-[#212a3b]"
                                                        : "border-gray-400"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-[#212a3b]" />
                                                )}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base text-[var(--text-primary)]">
                                                    {voice.name}
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                                    {voice.description}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Female Voices Group */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
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
                                                        ? "border-[#212a3b]"
                                                        : "border-gray-400"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-[#212a3b]" />
                                                )}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base text-[var(--text-primary)]">
                                                    {voice.name}
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                                                    {voice.description}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            id="begin-synthesis-btn"
                            className="form-btn shadow-soft-md"
                        >
                            Begin Synthesis
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default AddBookForm;
