import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AddBookForm from "@/components/AddBookForm";

export const metadata: Metadata = {
    title: "Add New Book | Libris AI",
    description: "Upload a PDF to generate your interactive AI voice interview.",
};

const NewBookPage = () => {
    return (
        <main className="container relative">
            {/* Floating Back Button */}
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

            <div className="wrapper">
                <AddBookForm />
            </div>
        </main>
    );
};

export default NewBookPage;
