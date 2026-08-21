"use client";

import React, { useState } from "react";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import { SAMPLE_BOOKS } from "@/lib/constants";
import type { BookCardProps } from "@/types";

interface BookListProps {
    initialBooks?: BookCardProps[];
}

const BookList = ({ initialBooks = SAMPLE_BOOKS }: BookListProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const books = initialBooks;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredBooks = books.filter((book) => {
        if (!normalizedQuery) return true;
        return (
            book.title.toLowerCase().includes(normalizedQuery) ||
            book.author.toLowerCase().includes(normalizedQuery)
        );
    });

    return (
        <section aria-labelledby="books-section-title" className="mt-10">
            {/* Section header */}
            <div className="library-filter-bar">
                <h2 id="books-section-title" className="section-title">
                    My Books
                </h2>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="library-search-wrapper">
                        <svg
                            className="w-4 h-4 text-[var(--text-muted)] ml-3 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                            />
                        </svg>
                        <input
                            id="book-search-input"
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search books…"
                            className="library-search-input bg-transparent text-sm"
                            aria-label="Search books"
                        />
                    </div>

                    {/* Add book shortcut */}
                    <Link
                        href="/books/new"
                        id="books-section-add-btn"
                        className="library-cta-primary !w-fit !px-4 !py-2.5 !text-sm whitespace-nowrap"
                    >
                        <span className="text-base leading-none">+</span>
                        <span>Add book</span>
                    </Link>
                </div>
            </div>

            {/* Books grid / Empty states */}
            {books.length === 0 ? (
                <div className="library-empty-card text-center">
                    <p className="section-title mb-2">No books yet</p>
                    <p className="subtitle text-base mb-6">
                        Upload a PDF to start an AI conversation with your first book.
                    </p>
                    <Link href="/books/new" className="library-cta-primary inline-flex w-fit">
                        <span className="text-xl leading-none">+</span>
                        <span>Add your first book</span>
                    </Link>
                </div>
            ) : filteredBooks.length > 0 ? (
                <div className="library-books-grid">
                    {filteredBooks.map((book) => (
                        <BookCard key={book.slug || book.id || book.title} {...book} />
                    ))}
                </div>
            ) : (
                <div className="library-empty-card text-center">
                    <p className="section-title mb-2">No matching books found</p>
                    <p className="subtitle text-base mb-6">
                        No books matched &ldquo;{searchQuery}&rdquo;. Try searching by another title or author.
                    </p>
                    <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="library-cta-primary inline-flex w-fit !text-base"
                    >
                        Clear search
                    </button>
                </div>
            )}
        </section>
    );
};

export default BookList;
