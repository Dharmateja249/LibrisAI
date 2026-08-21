import React from "react";
import { auth } from "@clerk/nextjs/server";
import LibraryHero from "@/components/LibraryHero";
import BookList from "@/components/BookList";
import { getBooks } from "@/lib/actions/book.actions";

export const dynamic = "force-dynamic";

const Page = async () => {
    const { userId } = await auth();
    const books = await getBooks({ clerkId: userId ?? undefined });

    return (
        <main className="container">
            <div className="wrapper">
                <LibraryHero />
                <BookList initialBooks={books} />
            </div>
        </main>
    );
};

export default Page;
