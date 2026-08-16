import React from "react";
import LibraryHero from "@/components/LibraryHero";
import BookList from "@/components/BookList";

const Page = () => {
    return (
        <main className="container">
            <div className="wrapper">
                <LibraryHero />
                <BookList />
            </div>
        </main>
    );
};

export default Page;
