"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Book from "@/models/Book";
import BookSegment from "@/models/BookSegment";
import VoiceSession from "@/models/VoiceSession";
import { SAMPLE_BOOKS } from "@/lib/constants";
import { uploadToBlob } from "@/lib/blob";
import type {
    BookCardProps,
    CreateBookParams,
    CreateBookSegmentInput,
    CreateBookSegmentParams,
    CreateVoiceSessionParams,
    GetBooksParams,
    IBookSegment,
} from "@/types";

/**
 * Generate a clean, URL-friendly slug with uniqueness fallback
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

/**
 * Default sample segment generator for books
 */
function getDefaultSegments(title: string, author: string): CreateBookSegmentInput[] {
    return [
        {
            segmentNumber: 1,
            title: `Introduction & Core Thesis of ${title}`,
            content: `An exploratory introduction to the central themes and foundational insights presented by ${author} in "${title}". This segment lays out the core questions, context, and motivation behind the work.`,
            summary: `Foundational concepts, background context, and thesis breakdown for "${title}".`,
            keyTakeaways: [
                `Understanding the author's primary perspective and premise in ${title}`,
                "Key problems and historical or intellectual context explored",
                "Fundamental definitions and core framework preview",
            ],
            pageStart: 1,
            pageEnd: 30,
            wordCount: 520,
            audioUrl: "",
        },
        {
            segmentNumber: 2,
            title: "Key Frameworks & Deep Dive Analysis",
            content: `A deep-dive investigation into the core principles, systemic frameworks, and analytical models proposed by ${author}. This segment unpacks evidence, thought experiments, and nuanced arguments.`,
            summary: `Systematic breakdown of the most critical frameworks and arguments in the book.`,
            keyTakeaways: [
                "Step-by-step examination of the author's central methodology",
                "Critical distinctions, case studies, and evidentiary examples",
                "Common misconceptions addressed and refuted in the text",
            ],
            pageStart: 31,
            pageEnd: 120,
            wordCount: 780,
            audioUrl: "",
        },
        {
            segmentNumber: 3,
            title: "Actionable Insights & Practical Application",
            content: `Practical applications, strategic takeaways, and actionable advice derived from ${title}. Focuses on how readers and listeners can implement the author's concepts in everyday decisions, leadership, and personal growth.`,
            summary: `Direct actionable takeaways and reflective questions for real-world execution.`,
            keyTakeaways: [
                "Immediate actions and behavioral shifts recommended by the author",
                "Frameworks for long-term consistency and sustained impact",
                "Discussion questions and conversational prompts for voice interaction",
            ],
            pageStart: 121,
            pageEnd: 200,
            wordCount: 610,
            audioUrl: "",
        },
    ];
}

/**
 * Checks if a book with the given title (and optional author) already exists in MongoDB.
 */
export async function checkBookExists(title: string, author?: string, clerkId?: string) {
    try {
        if (!process.env.MONGODB_URI) {
            const query = title.trim().toLowerCase();
            const sample = SAMPLE_BOOKS.find(
                (b) => b.title.toLowerCase() === query
            );
            if (sample) {
                return {
                    exists: true,
                    book: {
                        id: "sample-" + sample.slug,
                        title: sample.title,
                        author: sample.author,
                        slug: sample.slug,
                    },
                };
            }
            return { exists: false };
        }

        await connectToDatabase();

        const escapedTitle = title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const filter: Record<string, unknown> = {
            title: { $regex: new RegExp(`^${escapedTitle}$`, "i") },
        };

        if (clerkId) {
            filter.clerkId = clerkId;
        }

        if (author && author.trim()) {
            const escapedAuthor = author.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.author = { $regex: new RegExp(`^${escapedAuthor}$`, "i") };
        }

        const existing = await Book.findOne(filter).lean();
        if (existing) {
            return {
                exists: true,
                book: {
                    id: existing._id.toString(),
                    title: existing.title,
                    author: existing.author,
                    slug: existing.slug,
                },
            };
        }

        return { exists: false };
    } catch (error) {
        console.error("Error checking book duplicate:", error);
        return { exists: false };
    }
}

/**
 * Seeds initial sample books and their segments into MongoDB if the collection is empty.
 */
export async function seedSampleBooks() {
    try {
        await connectToDatabase();
        const count = await Book.countDocuments();
        if (count === 0) {
            for (const sample of SAMPLE_BOOKS) {
                const defaultSegs = getDefaultSegments(sample.title, sample.author);

                const newBook = await Book.create({
                    title: sample.title,
                    author: sample.author,
                    slug: sample.slug,
                    coverURL: sample.coverURL,
                    voice: "priya",
                    status: "ready",
                    summary: `Key concepts, actionable insights, and discussion points from ${sample.title} by ${sample.author}.`,
                    segments: [],
                });

                const createdSegments = await BookSegment.insertMany(
                    defaultSegs.map((s) => ({
                        ...s,
                        bookId: newBook._id,
                    }))
                );

                newBook.segments = createdSegments.map((s) => s._id as Types.ObjectId);
                await newBook.save();
            }
            console.log("Successfully seeded sample books with attached segments to MongoDB");
        }
    } catch (error) {
        console.error("Error seeding sample books:", error);
    }
}

/**
 * Retrieves all books matching optional search query & clerkId.
 */
export async function getBooks(params: GetBooksParams = {}): Promise<BookCardProps[]> {
    const { query = "", limit = 50, clerkId } = params;

    try {
        if (!process.env.MONGODB_URI) {
            return filterSampleBooks(query);
        }

        await connectToDatabase();

        const count = await Book.countDocuments();
        if (count === 0) {
            await seedSampleBooks();
        }

        const filter: Record<string, unknown> = {};

        if (clerkId) {
            filter.clerkId = clerkId;
        }

        if (query.trim()) {
            const regex = new RegExp(query.trim(), "i");
            filter.$or = [{ title: regex }, { author: regex }];
        }

        const books = await Book.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return books.map((book) => ({
            id: book._id ? book._id.toString() : undefined,
            title: book.title,
            author: book.author,
            coverURL: book.coverURL,
            slug: book.slug,
        }));
    } catch (error) {
        console.error("Failed to fetch books from MongoDB:", error);
        return filterSampleBooks(query);
    }
}

function filterSampleBooks(query: string): BookCardProps[] {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_BOOKS;
    return SAMPLE_BOOKS.filter(
        (b) =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q)
    );
}

/**
 * Retrieves a single book by slug along with its attached segments.
 */
export async function getBookBySlug(slug: string) {
    try {
        if (!process.env.MONGODB_URI) {
            const sample = SAMPLE_BOOKS.find((b) => b.slug === slug);
            if (!sample) return null;
            return {
                _id: "sample-" + sample.slug,
                title: sample.title,
                author: sample.author,
                slug: sample.slug,
                coverURL: sample.coverURL,
                voice: "priya",
                status: "ready",
                summary: `Comprehensive AI voice interactive synthesis for "${sample.title}" by ${sample.author}.`,
                fileSize: 1024 * 1024 * 2.4,
                pagesCount: 280,
                segments: getDefaultSegments(sample.title, sample.author).map((s, idx) => ({
                    ...s,
                    _id: `sample-seg-${idx + 1}`,
                    bookId: "sample-" + sample.slug,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

        await connectToDatabase();
        let book = await Book.findOne({ slug }).populate("segments").lean();

        if (!book) {
            const sample = SAMPLE_BOOKS.find((b) => b.slug === slug);
            if (sample) {
                const defaultSegs = getDefaultSegments(sample.title, sample.author);
                const created = await Book.create({
                    title: sample.title,
                    author: sample.author,
                    slug: sample.slug,
                    coverURL: sample.coverURL,
                    voice: "priya",
                    status: "ready",
                    summary: `Comprehensive AI voice interactive synthesis for "${sample.title}" by ${sample.author}.`,
                    segments: [],
                });

                const segs = await BookSegment.insertMany(
                    defaultSegs.map((s) => ({
                        ...s,
                        bookId: created._id,
                    }))
                );

                created.segments = segs.map((s) => s._id as Types.ObjectId);
                await created.save();

                book = await Book.findById(created._id).populate("segments").lean();
            }
        }

        if (!book) return null;

        // If the book exists but has empty segments, check BookSegment collection
        let rawSegments: Array<Record<string, unknown>> = Array.isArray(book.segments)
            ? (book.segments as unknown as Array<Record<string, unknown>>)
            : [];

        if (rawSegments.length === 0) {
            const dbSegments = await BookSegment.find({ bookId: book._id })
                .sort({ segmentNumber: 1 })
                .lean();

            if (dbSegments.length > 0) {
                rawSegments = dbSegments as unknown as Array<Record<string, unknown>>;
            } else {
                const generated = await BookSegment.insertMany(
                    getDefaultSegments(book.title, book.author).map((s) => ({
                        ...s,
                        bookId: book._id,
                    }))
                );
                await Book.findByIdAndUpdate(book._id, {
                    segments: generated.map((s) => s._id),
                });
                rawSegments = generated.map((s) => s.toObject()) as unknown as Array<Record<string, unknown>>;
            }
        }

        const formattedSegments: IBookSegment[] = rawSegments.map((s) => ({
            _id: s._id ? String(s._id) : undefined,
            bookId: s.bookId ? String(s.bookId) : String(book._id),
            segmentNumber: typeof s.segmentNumber === "number" ? s.segmentNumber : 1,
            title: typeof s.title === "string" ? s.title : "",
            content: typeof s.content === "string" ? s.content : "",
            summary: typeof s.summary === "string" ? s.summary : "",
            keyTakeaways: Array.isArray(s.keyTakeaways) ? (s.keyTakeaways as string[]) : [],
            pageStart: typeof s.pageStart === "number" ? s.pageStart : undefined,
            pageEnd: typeof s.pageEnd === "number" ? s.pageEnd : undefined,
            wordCount: typeof s.wordCount === "number" ? s.wordCount : undefined,
            audioUrl: typeof s.audioUrl === "string" ? s.audioUrl : undefined,
            createdAt: s.createdAt ? new Date(String(s.createdAt)) : undefined,
            updatedAt: s.updatedAt ? new Date(String(s.updatedAt)) : undefined,
        }));

        return {
            ...book,
            _id: book._id?.toString(),
            segments: formattedSegments,
            createdAt: book.createdAt?.toISOString?.() || book.createdAt,
            updatedAt: book.updatedAt?.toISOString?.() || book.updatedAt,
        };
    } catch (error) {
        console.error(`Failed to fetch book slug "${slug}":`, error);
        return null;
    }
}

/**
 * Creates a new book record in MongoDB, uploads cover to Vercel Blob (if data URL), and attaches segments.
 */
export async function createBook(params: CreateBookParams) {
    try {
        await connectToDatabase();

        // 1. Check for Duplicate Book
        const duplicateCheck = await checkBookExists(params.title, params.author, params.clerkId);
        if (duplicateCheck.exists && duplicateCheck.book) {
            return {
                success: false,
                isDuplicate: true,
                error: `A book titled "${params.title}" already exists in your library.`,
                existingSlug: duplicateCheck.book.slug,
            };
        }

        const baseSlug = slugify(params.title);
        let uniqueSlug = baseSlug;
        let counter = 1;

        while (await Book.exists({ slug: uniqueSlug })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 2. Upload cover to Vercel Blob if it is a base64 Data URL
        let finalCoverURL = params.coverURL || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800";
        if (params.coverURL && params.coverURL.startsWith("data:")) {
            const blobResult = await uploadToBlob(params.coverURL, `${uniqueSlug}-cover.jpg`, "image/jpeg");
            finalCoverURL = blobResult.url;
        }

        // 3. Create the book document
        const newBook = await Book.create({
            title: params.title.trim(),
            author: params.author.trim(),
            slug: uniqueSlug,
            coverURL: finalCoverURL,
            pdfUrl: params.pdfUrl || "",
            voice: params.voice || "priya",
            fileSize: params.fileSize || 0,
            pagesCount: params.pagesCount || 0,
            clerkId: params.clerkId || "",
            status: "ready",
            summary:
                params.summary ||
                `Synthesized interactive voice model and conceptual summary for "${params.title.trim()}" by ${params.author.trim()}.`,
            segments: [],
        });

        // 4. Prepare segments (either passed in from PDF parser or structured defaults)
        const segmentsToCreate: CreateBookSegmentInput[] =
            params.segments && params.segments.length > 0
                ? params.segments
                : getDefaultSegments(params.title.trim(), params.author.trim());

        // 5. Create all segment documents with bookId attached
        const createdSegments = await BookSegment.insertMany(
            segmentsToCreate.map((segment, idx) => ({
                bookId: newBook._id,
                segmentNumber: segment.segmentNumber || idx + 1,
                title: segment.title,
                content: segment.content,
                summary: segment.summary || "",
                keyTakeaways: segment.keyTakeaways || [],
                pageStart: segment.pageStart || 0,
                pageEnd: segment.pageEnd || 0,
                wordCount: segment.wordCount || 0,
                audioUrl: segment.audioUrl || "",
            }))
        );

        // 6. Attach segment ObjectIDs to the book document
        newBook.segments = createdSegments.map((s) => s._id as Types.ObjectId);
        await newBook.save();

        revalidatePath("/");
        revalidatePath(`/books/${uniqueSlug}`);
        revalidatePath("/books/new");

        return {
            success: true,
            book: {
                id: newBook._id.toString(),
                title: newBook.title,
                author: newBook.author,
                slug: newBook.slug,
                coverURL: newBook.coverURL,
                segmentsCount: createdSegments.length,
                segments: createdSegments.map((s) => ({
                    id: s._id.toString(),
                    title: s.title,
                    segmentNumber: s.segmentNumber,
                })),
            },
        };
    } catch (error) {
        console.error("Failed to create book in MongoDB:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create book and attach segments",
        };
    }
}

/**
 * Creates and attaches an individual segment directly to an existing book.
 */
export async function createBookSegment(params: CreateBookSegmentParams) {
    try {
        await connectToDatabase();
        const segment = await BookSegment.create({
            ...params,
            keyTakeaways: params.keyTakeaways || [],
        });

        // Attach segment to the Book document
        await Book.findByIdAndUpdate(params.bookId, {
            $addToSet: { segments: segment._id },
        });

        return {
            success: true,
            segment: {
                id: segment._id.toString(),
                bookId: segment.bookId.toString(),
                segmentNumber: segment.segmentNumber,
                title: segment.title,
                summary: segment.summary,
            },
        };
    } catch (error) {
        console.error("Failed to create book segment:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create segment",
        };
    }
}

/**
 * Retrieves all segments for a given book.
 */
export async function getBookSegments(bookId: string) {
    try {
        if (!process.env.MONGODB_URI || bookId.startsWith("sample-")) {
            return [];
        }

        await connectToDatabase();
        const segments = await BookSegment.find({ bookId })
            .sort({ segmentNumber: 1 })
            .lean();

        return segments.map((s) => ({
            ...s,
            _id: s._id.toString(),
            bookId: s.bookId.toString(),
            createdAt: s.createdAt?.toISOString(),
            updatedAt: s.updatedAt?.toISOString(),
        }));
    } catch (error) {
        console.error("Failed to get book segments:", error);
        return [];
    }
}

/**
 * Creates a new interactive AI voice session for a user on a book.
 */
export async function createVoiceSession(params: CreateVoiceSessionParams) {
    try {
        await connectToDatabase();
        const session = await VoiceSession.create({
            bookId: params.bookId,
            clerkId: params.clerkId,
            voice: params.voice || "priya",
            status: "active",
            messages: params.messages || [
                {
                    role: "assistant",
                    content: "Hello! I'm ready to discuss this book with you. What would you like to explore first?",
                    timestamp: new Date(),
                },
            ],
            sessionDuration: 0,
            topicsDiscussed: [],
        });

        return {
            success: true,
            sessionId: session._id.toString(),
        };
    } catch (error) {
        console.error("Failed to create voice session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create voice session",
        };
    }
}

/**
 * Deletes a book and all its associated segments and voice sessions from MongoDB.
 * Also removes the cover image from Vercel Blob if it was stored there.
 */
export async function deleteBook(bookId: string) {
    try {
        await connectToDatabase();

        const book = await Book.findById(bookId).lean();
        if (!book) {
            return { success: false, error: "Book not found." };
        }

        // 1. Delete all segments linked to this book
        await BookSegment.deleteMany({ bookId: book._id });

        // 2. Delete all voice sessions linked to this book
        await VoiceSession.deleteMany({ bookId: book._id });

        // 3. Delete cover from Vercel Blob if it's a blob URL
        if (book.coverURL && book.coverURL.includes("blob.vercel-storage.com")) {
            try {
                const { del } = await import("@vercel/blob");
                await del(book.coverURL);
            } catch (blobErr) {
                // Non-critical – log but don't block the delete
                console.warn("Could not delete cover from Vercel Blob:", blobErr);
            }
        }

        // 4. Delete the book document itself
        await Book.findByIdAndDelete(book._id);

        revalidatePath("/");
        revalidatePath(`/books/${book.slug}`);

        return { success: true };
    } catch (error) {
        console.error("Failed to delete book:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete book",
        };
    }
}

