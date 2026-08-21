import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getBookBySlug, getBookSegments } from "@/lib/actions/book.actions";
import DeleteBookButton from "@/components/DeleteBookButton";
import VoiceInterviewButton from "@/components/VoiceInterviewButton";

interface BookDetailPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: BookDetailPageProps): Promise<Metadata> {
    const { slug } = await params;
    const { userId } = await auth();
    const book = await getBookBySlug(slug, userId ?? undefined);

    if (!book) {
        return {
            title: "Book Not Found | Libris AI",
        };
    }

    return {
        title: `${book.title} by ${book.author} | Libris AI`,
        description: `Interactive voice conversation and AI synthesis for ${book.title}.`,
    };
}

const BookDetailPage = async ({ params }: BookDetailPageProps) => {
    const { slug } = await params;
    const { userId } = await auth();
    const book = await getBookBySlug(slug, userId ?? undefined);

    if (!book) {
        notFound();
    }

    // Prefer the populated segments already returned by getBookBySlug (works for
    // both sample and DB books). Only fall back to a separate query when the book
    // response legitimately omits them (e.g. segments weren't populated).
    let segments = Array.isArray(book.segments) && book.segments.length > 0
        ? book.segments
        : [];

    if (segments.length === 0 && book._id && !String(book._id).startsWith("sample-")) {
        segments = await getBookSegments(String(book._id));
    }

    return (
        <main className="container relative">
            {/* Back button */}
            <Link
                href="/"
                className="back-btn-floating"
                aria-label="Back to Library"
                id="back-to-library-btn"
            >
                <svg
                    className="w-5 h-5 text-[var(--text-primary)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                </svg>
            </Link>

            <div className="wrapper max-w-4xl mx-auto py-8">
                {/* Book Header Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8 shadow-soft-sm flex flex-col md:flex-row gap-8 items-start mb-10">
                    <div className="w-full md:w-48 h-64 relative rounded-xl overflow-hidden shadow-soft-md shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <Image
                            src={book.coverURL}
                            alt={`${book.title} cover`}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>

                    <div className="flex-1 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {book.status || "ready"}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                    Voice: <strong className="capitalize">{book.voice || "Priya"}</strong>
                                </span>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[var(--text-primary)] leading-tight mb-2">
                                {book.title}
                            </h1>
                            <p className="text-base text-[var(--text-secondary)] font-medium mb-4">
                                by {book.author}
                            </p>

                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-4">
                                {book.summary || "Interactive AI discussion model generated from document text."}
                            </p>
                        </div>

                        <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-4">
                            <VoiceInterviewButton
                                bookId={book._id ? String(book._id) : undefined}
                                bookSlug={book.slug}
                                bookTitle={book.title}
                                bookAuthor={book.author}
                                bookVoice={book.voice}
                                bookSummary={book.summary}
                            />

                            <Link
                                href="/books/new"
                                className="px-4 py-2.5 rounded-full text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Upload Another Book
                            </Link>

                            {/* Delete button – only show for the owner of real DB books */}
                            {book._id &&
                                !String(book._id).startsWith("sample-") &&
                                Boolean(userId && book.clerkId === userId) && (
                                    <DeleteBookButton
                                        bookId={String(book._id)}
                                        bookTitle={book.title}
                                    />
                            )}
                        </div>
                    </div>
                </div>

                {/* Segments / Chapters Section */}
                <section aria-labelledby="segments-heading" className="space-y-4">
                    <h2 id="segments-heading" className="text-xl font-serif font-bold text-[var(--text-primary)]">
                        Book Chapters & Key Concepts
                    </h2>

                    {segments.length === 0 ? (
                        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 text-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Full transcript and concept maps are loaded and ready for voice discussion.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {segments.map((segment) => (
                                <div
                                    key={segment._id}
                                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[#663820]/40 transition-all shadow-soft-xs"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-[#663820] tracking-wide uppercase">
                                            Chapter {segment.segmentNumber}
                                        </span>
                                        {segment.wordCount ? (
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {segment.wordCount} words
                                            </span>
                                        ) : null}
                                    </div>
                                    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                                        {segment.title}
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                                        {segment.summary || segment.content}
                                    </p>
                                    {segment.keyTakeaways && segment.keyTakeaways.length > 0 ? (
                                        <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-1">
                                            {segment.keyTakeaways.map((takeaway, idx) => (
                                                <li key={idx}>{takeaway}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
};

export default BookDetailPage;
