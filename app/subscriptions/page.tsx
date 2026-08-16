import React from "react";
import type { Metadata } from "next";
import { PricingTable } from "@clerk/nextjs";

export const metadata: Metadata = {
    title: "Subscription Plans | Libris AI",
    description:
        "Choose a subscription plan to unlock more books and interactive AI voice conversations with Libris AI.",
};

const SubscriptionsPage = () => {
    return (
        <main className="clerk-subscriptions">
            <h1 className="page-title font-serif">Choose Your Plan</h1>
            <p className="page-description text-[var(--text-secondary)]">
                Upgrade your account to synthesise and interact with more books.
            </p>

            <div className="clerk-pricing-table-wrapper w-full mt-8">
                <PricingTable />
            </div>
        </main>
    );
};

export default SubscriptionsPage;
