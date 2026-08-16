"use client";

import React from "react";

export interface LoadingStep {
    label: string;
    status: "pending" | "active" | "done";
}

interface LoadingOverlayProps {
    steps: LoadingStep[];
    title?: string;
}

const LoadingOverlay = ({
    steps,
    title = "Synthesising your book",
}: LoadingOverlayProps) => {
    const activeStep = steps.find((step) => step.status === "active");

    return (
        <div
            className="loading-wrapper"
            role="dialog"
            aria-modal="true"
            aria-label="Synthesising book"
        >
            <div className="loading-shadow-wrapper bg-[var(--bg-card)] shadow-soft-lg border border-[var(--border-subtle)]">
                <div className="loading-shadow">
                    {/* Animated Spinner */}
                    <div className="relative flex items-center justify-center">
                        <svg
                            className="loading-animation w-14 h-14 text-[#663820]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle
                                className="opacity-20"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className="opacity-90"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 className="loading-title font-serif text-center">{title}</h2>

                    {/* Progress Steps */}
                    <div className="loading-progress w-full flex flex-col gap-3 max-w-sm">
                        {/* Live region for screen readers */}
                        <div role="status" className="sr-only">
                            {activeStep ? activeStep.label : ""}
                        </div>
                        {steps.map((step, index) => {
                            const isDone = step.status === "done";
                            const isActive = step.status === "active";

                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between gap-3 text-sm transition-opacity duration-300"
                                >
                                    <div className="flex items-center gap-3">
                                        {isDone ? (
                                            <span className="w-5 h-5 rounded-full bg-[#7c9a82] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                ✓
                                            </span>
                                        ) : isActive ? (
                                            <span className="w-2.5 h-2.5 mx-1 rounded-full bg-[#663820] animate-ping shrink-0" />
                                        ) : (
                                            <span className="w-2 h-2 mx-1.5 rounded-full bg-gray-300 shrink-0" />
                                        )}
                                        <span
                                            className={`font-medium ${
                                                isActive
                                                    ? "text-[var(--text-primary)] font-semibold"
                                                    : isDone
                                                    ? "text-[#7c9a82]"
                                                    : "text-[var(--text-secondary)] opacity-60"
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <span className="text-xs text-[#663820] font-medium animate-pulse">
                                            Processing…
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
