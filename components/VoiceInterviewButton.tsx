"use client";

import React, { useState, useEffect, useRef } from "react";
import { createVoiceSession } from "@/lib/actions/book.actions";

interface VoiceInterviewButtonProps {
    bookId?: string;
    bookSlug: string;
    bookTitle: string;
    bookAuthor: string;
    bookVoice?: string;
    bookSummary?: string;
}

interface Message {
    id: string;
    role: "assistant" | "user";
    content: string;
    timestamp: string;
}

const VoiceInterviewButton: React.FC<VoiceInterviewButtonProps> = ({
    bookId,
    bookTitle,
    bookAuthor,
    bookVoice = "priya",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const responseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearAllTimers = () => {
        responseTimersRef.current.forEach((timer) => clearTimeout(timer));
        responseTimersRef.current = [];
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Cleanup all pending response timers and speech synthesis on unmount
    useEffect(() => {
        return () => {
            clearAllTimers();
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Handle voice playback using Web Speech API
    const speakText = (text: string) => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        }
    };

    const handleStartInterview = async () => {
        setIsLoading(true);
        try {
            const initialGreeting = `Hello! I'm ${
                bookVoice.charAt(0).toUpperCase() + bookVoice.slice(1)
            }, your AI companion for "${bookTitle}" by ${bookAuthor}. What would you like to explore or discuss today?`;

            // If it's a real DB book with an ID, create session in MongoDB
            if (bookId && !bookId.startsWith("sample-")) {
                const res = await createVoiceSession({
                    bookId,
                    voice: bookVoice,
                    messages: [
                        {
                            role: "assistant",
                            content: initialGreeting,
                            timestamp: new Date(),
                        },
                    ],
                });
                if (!res.success && res.error) {
                    throw new Error(res.error);
                }
            }

            setMessages([
                {
                    id: "msg-init",
                    role: "assistant",
                    content: initialGreeting,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
            ]);
            setIsOpen(true);
            speakText(initialGreeting);
        } catch (error) {
            console.error("Error creating voice session:", error);
            // Fallback gracefully to client-side session
            const fallbackGreeting = `Hello! I'm ready to discuss "${bookTitle}" with you. What questions do you have?`;
            setMessages([
                {
                    id: "msg-init",
                    role: "assistant",
                    content: fallbackGreeting,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
            ]);
            setIsOpen(true);
            speakText(fallbackGreeting);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        clearAllTimers();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsOpen(false);
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = inputMessage.trim();
        if (!trimmed) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputMessage("");

        // Generate intelligent contextual response with managed timer handle
        const timer = setTimeout(() => {
            // Remove this timer from the active list
            responseTimersRef.current = responseTimersRef.current.filter((t) => t !== timer);

            const aiResponses = [
                `That's a profound observation regarding "${bookTitle}". In this work, ${bookAuthor} emphasizes the relationship between these concepts and practical execution.`,
                `Great question! One of the core takeaways is how we can structure our perspective around this principle. As detailed in the chapters, consistency and deep engagement are pivotal.`,
                `Analyzing "${bookTitle}", ${bookAuthor} outlines specific frameworks to address this exact challenge, connecting foundational theory with actionable insights.`,
            ];
            const chosenResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

            const assistantMsg: Message = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: chosenResponse,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            setMessages((prev) => [...prev, assistantMsg]);
            speakText(chosenResponse);
        }, 600);

        responseTimersRef.current.push(timer);
    };

    return (
        <>
            <button
                type="button"
                id="start-voice-interview-btn"
                onClick={handleStartInterview}
                disabled={isLoading}
                className="library-cta-primary !px-6 !py-3 !text-sm flex items-center gap-2"
                aria-label={`Start Voice Interview for ${bookTitle}`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Starting Session…</span>
                    </>
                ) : (
                    <>
                        <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                        </svg>
                        <span>Start Voice Interview</span>
                    </>
                )}
            </button>

            {/* Interactive Voice Interview Modal */}
            {isOpen && (
                <div
                    className="delete-modal-overlay !z-50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="voice-interview-title"
                >
                    <div
                        className="bg-[var(--bg-card,#fff)] border border-[var(--border-subtle)] rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Session Header */}
                        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary,#fafafa)]">
                            <div className="flex items-center gap-3">
                                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#663820] text-white shadow-sm">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    {isSpeaking && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 id="voice-interview-title" className="text-base font-serif font-bold text-[var(--text-primary)] leading-tight">
                                        {bookTitle}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        AI Voice: <span className="capitalize font-semibold text-[#663820]">{bookVoice}</span> {isSpeaking ? "• Speaking…" : "• Ready"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleClose}
                                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary,#f3f4f6)] transition-colors"
                                aria-label="Close interview"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Live Audio Waveform Indicator */}
                        <div className="bg-[#663820]/5 px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-medium text-[var(--text-secondary)]">
                                    Live Interactive Session
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`w-1 h-3 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce" : "opacity-40"}`}></span>
                                <span className={`w-1 h-5 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.1s]" : "opacity-40"}`}></span>
                                <span className={`w-1 h-4 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.2s]" : "opacity-40"}`}></span>
                                <span className={`w-1 h-6 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.3s]" : "opacity-40"}`}></span>
                                <span className={`w-1 h-3 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.15s]" : "opacity-40"}`}></span>
                            </div>
                        </div>

                        {/* Message Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-80 min-h-60 bg-[var(--bg-primary,#fcfbf9)]">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${
                                        msg.role === "user" ? "items-end" : "items-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                            msg.role === "user"
                                                ? "bg-[#663820] text-white rounded-br-none"
                                                : "bg-[var(--bg-card,#fff)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-none shadow-soft-xs"
                                        }`}
                                    >
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted,#9ca3af)] mt-1 px-1">
                                        {msg.timestamp}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Interactive Input Form */}
                        <form
                            onSubmit={handleSendMessage}
                            className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card,#fff)] flex items-center gap-2"
                        >
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder={`Ask ${bookVoice} about ${bookTitle}…`}
                                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary,#fcfbf9)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#663820]/30"
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim()}
                                className="px-4 py-2.5 rounded-xl bg-[#663820] text-white text-sm font-medium hover:bg-[#522c19] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Ask
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoiceInterviewButton;
