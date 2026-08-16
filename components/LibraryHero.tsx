"use client";

import Image from "next/image";
import Link from "next/link";
import heroIllustration from "@/assets/assets/hero-illustration.png";

const steps = [
    {
        number: 1,
        title: "Upload PDF",
        description: "Add your book file",
    },
    {
        number: 2,
        title: "AI Processing",
        description: "We analyze the content",
    },
    {
        number: 3,
        title: "Voice Chat",
        description: "Discuss with AI",
    },
];

const LibraryHero = () => {
    return (
        <section
            aria-label="Library hero"
            className="library-hero-card"
        >
            <div className="library-hero-content">
                {/* Left — heading, description, CTA */}
                <div className="library-hero-text">
                    <h1 className="library-hero-title">Your Library</h1>

                    <p className="library-hero-description">
                        Convert your books into interactive AI conversations.
                        <br className="hidden sm:block" />
                        Listen, learn, and discuss your favorite reads.
                    </p>

                    {/* Mobile illustration */}
                    <div className="library-hero-illustration">
                        <Image
                            src={heroIllustration}
                            alt="Vintage books, globe and reading lamp illustration"
                            width={260}
                            height={200}
                            priority
                            className="object-contain drop-shadow-md"
                        />
                    </div>

                    <Link
                        href="/books/new"
                        className="library-cta-primary"
                        id="add-new-book-btn"
                    >
                        <span className="text-xl leading-none">+</span>
                        <span>Add new book</span>
                    </Link>
                </div>

                {/* Center — illustration (desktop) */}
                <div className="library-hero-illustration-desktop">
                    <Image
                        src={heroIllustration}
                        alt="Vintage books, globe and reading lamp illustration"
                        width={320}
                        height={260}
                        priority
                        className="object-contain drop-shadow-md"
                    />
                </div>

                {/* Right — steps card */}
                <div className="library-steps-card flex flex-col gap-4 w-full lg:w-[220px] shrink-0">
                    {steps.map((step, index) => (
                        <div key={step.number}>
                            <div className="library-step-item">
                                <span className="library-step-number" aria-hidden="true">
                                    {step.number}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <p className="library-step-title">{step.title}</p>
                                    <p className="library-step-description">{step.description}</p>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="ml-4 mt-3 h-px bg-[var(--border-subtle)]" aria-hidden="true" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default LibraryHero;
