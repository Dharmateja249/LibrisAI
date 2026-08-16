import type { BookCardProps } from "@/types";

// ============================================================
// SAMPLE BOOKS  (replace with DB fetch once backend is ready)
// ============================================================
export const SAMPLE_BOOKS: BookCardProps[] = [
    {
        title: "Atomic Habits",
        author: "James Clear",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
        slug: "atomic-habits",
    },
    {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
        slug: "the-great-gatsby",
    },
    {
        title: "Sapiens",
        author: "Yuval Noah Harari",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
        slug: "sapiens",
    },
    {
        title: "Thinking, Fast and Slow",
        author: "Daniel Kahneman",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
        slug: "thinking-fast-and-slow",
    },
    {
        title: "1984",
        author: "George Orwell",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
        slug: "1984",
    },
    {
        title: "The Alchemist",
        author: "Paulo Coelho",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",
        slug: "the-alchemist",
    },
    {
        title: "Deep Work",
        author: "Cal Newport",
        coverURL: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg",
        slug: "deep-work",
    },
    {
        title: "Dune",
        author: "Frank Herbert",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
        slug: "dune",
    },
    {
        title: "Man's Search for Meaning",
        author: "Viktor E. Frankl",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780807014271-L.jpg",
        slug: "mans-search-for-meaning",
    },
    {
        title: "The Lean Startup",
        author: "Eric Ries",
        coverURL: "https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg",
        slug: "the-lean-startup",
    },
];

// ============================================================
// VOICE ASSISTANT OPTIONS
// ============================================================
export const VOICE_OPTIONS = [
    {
        id: "aarav",
        name: "Aarav",
        gender: "male" as const,
        description: "Young male, Indian-English, casual & conversational",
    },
    {
        id: "kabir",
        name: "Kabir",
        gender: "male" as const,
        description: "Middle-aged male, Indian, authoritative but warm",
    },
    {
        id: "rohan",
        name: "Rohan",
        gender: "male" as const,
        description: "Male, clear Indian accent, casual & easy-going",
    },
    {
        id: "priya",
        name: "Priya",
        gender: "female" as const,
        description: "Young female, Indian-English, calm & clear",
    },
    {
        id: "ananya",
        name: "Ananya",
        gender: "female" as const,
        description: "Young female, Indian, soft & approachable",
    },
];

