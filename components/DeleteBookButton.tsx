"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteBook } from "@/lib/actions/book.actions";

interface DeleteBookButtonProps {
    bookId: string;
    bookTitle: string;
}

const DeleteBookButton = ({ bookId, bookTitle }: DeleteBookButtonProps) => {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteBook(bookId);
            if (result.success) {
                router.push("/");
            } else {
                alert(result.error || "Failed to delete the book.");
                setIsDeleting(false);
                setShowConfirm(false);
            }
        } catch {
            alert("Something went wrong while deleting.");
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <button
                type="button"
                id="delete-book-btn"
                onClick={() => setShowConfirm(true)}
                className="delete-book-trigger"
                aria-label={`Delete ${bookTitle}`}
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
                <span>Delete Book</span>
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => !isDeleting && setShowConfirm(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-confirm-title"
                >
                    <div
                        className="delete-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Warning Icon */}
                        <div className="delete-modal-icon">
                            <svg
                                className="w-7 h-7 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                        </div>

                        <h3 id="delete-confirm-title" className="delete-modal-title">
                            Delete this book?
                        </h3>

                        <p className="delete-modal-desc">
                            <strong>&ldquo;{bookTitle}&rdquo;</strong> and all its chapters,
                            segments, and voice sessions will be permanently removed. This
                            action cannot be undone.
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                disabled={isDeleting}
                                className="delete-modal-cancel"
                                id="delete-cancel-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="delete-modal-confirm"
                                id="delete-confirm-btn"
                            >
                                {isDeleting ? (
                                    <span className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Deleting…
                                    </span>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeleteBookButton;
