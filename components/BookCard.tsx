"use client";

import Image from "next/image";
import Link from "next/link";
import type { BookCardProps } from "@/types";

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
    return (
        <Link
            href={`/books/${slug}`}
            className="group block"
            id={`book-card-${slug}`}
            aria-label={`Open ${title} by ${author}`}
        >
            <article className="book-card">
                {/* Cover */}
                <div className="book-card-cover-wrapper">
                    <Image
                        src={coverURL}
                        alt={`${title} cover`}
                        width={140}
                        height={200}
                        className="book-card-cover"
                        unoptimized
                    />
                </div>

                {/* Meta */}
                <div className="book-card-meta">
                    <p className="book-card-title">{title}</p>
                    <p className="book-card-author">{author}</p>
                </div>
            </article>
        </Link>
    );
};

export default BookCard;
