"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import logo from "@/assets/assets/logo.png";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Library", href: "/" },
    { label: "Add New", href: "/books/new" },
];

const Navbar = () => {
    const pathname = usePathname();

    return (
        <header className="fixed z-50 w-full bg-(--bg-primary)">
            <div className="wrapper navbar-height flex items-center justify-between py-4">
                <Link href="/" className="flex items-center gap-0.5">
                    <Image
                        src={logo}
                        alt="LibrisAI"
                        width={42}
                        height={26}
                    />
                    <span className="logo-text">LibrisAI</span>
                </Link>

                <div className="flex items-center gap-3 sm:gap-5">
                    <nav
                        aria-label="Primary navigation"
                        className="flex w-fit items-center gap-3 sm:gap-7.5"
                    >
                        {navItems.map(({ label, href }) => {
                            const isActive =
                                pathname === href ||
                                (href !== "/" && pathname.startsWith(href));

                            return (
                                <Link
                                    key={label}
                                    href={href}
                                    className={`nav-link-base ${isActive
                                            ? "nav-link-active"
                                            : "text-black hover:opacity-70"
                                        }`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <Show when="signed-out">
                            <div className="flex items-center gap-4">
                                <SignInButton mode="modal">
                                    <button
                                        type="button"
                                        className="text-sm font-medium text-black hover:opacity-70 transition-opacity"
                                    >
                                        Sign in
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button
                                        type="button"
                                        className="btn-primary whitespace-nowrap px-4 py-2 text-sm"
                                    >
                                        Sign up
                                    </button>
                                </SignUpButton>
                            </div>
                        </Show>

                        <Show when="signed-in">
                            <div className="flex items-center gap-2.5">
                                <UserButton />
                                <Link
                                    href="/subscriptions"
                                    className={`nav-link-base ${
                                        pathname === "/subscriptions" || pathname.startsWith("/subscriptions")
                                            ? "nav-link-active"
                                            : "text-black hover:opacity-70"
                                    }`}
                                >
                                    Subscriptions
                                </Link>
                            </div>
                        </Show>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;