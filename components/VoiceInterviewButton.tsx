"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createVoiceSession, addVoiceSessionMessages } from "@/lib/actions/book.actions";
import { chatWithBook, ChatMessage } from "@/lib/actions/chat.actions";

interface VoiceInterviewButtonProps {
    bookId?: string;
    bookSlug: string;
    bookTitle: string;
    bookAuthor: string;
    bookVoice?: string;
    bookSummary?: string;
    segments?: any[];
}

interface Message {
    id: string;
    role: "assistant" | "user";
    content: string;
    timestamp: string;
}

const CONVERSATION_STARTERS = [
    { label: "💡 Core Thesis", prompt: "What is the central thesis and main argument of this book?" },
    { label: "⚡ Daily Application", prompt: "How can I apply the author's key advice to my daily routine?" },
    { label: "📖 Key Frameworks", prompt: "Explain the most important framework or mental model in this book." },
    { label: "🤔 Critical Perspective", prompt: "What are the common critiques or limitations of the author's ideas?" },
];

const VoiceInterviewButton: React.FC<VoiceInterviewButtonProps> = ({
    bookId,
    bookTitle,
    bookAuthor,
    bookVoice = "priya",
    bookSummary = "",
    segments = [],
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [autoListen, setAutoListen] = useState(true);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [inputMessage, setInputMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [aiProvider, setAiProvider] = useState<"gemini" | "smart-fallback">("smart-fallback");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const autoListenRef = useRef(autoListen);
    const isOpenRef = useRef(isOpen);
    const isSpeakingRef = useRef(isSpeaking);

    // Keep refs synchronized with state
    useEffect(() => {
        autoListenRef.current = autoListen;
    }, [autoListen]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, interimTranscript, isThinking, isOpen]);

    // Check Speech Recognition support on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const win = window as any;
            const hasSR = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
            setSpeechSupported(hasSR);
        }
    }, []);

    // Stop speaking audio safely
    const stopSpeaking = useCallback(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    }, []);

    // Stop speech recognition safely
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {
                // Ignore abort error
            }
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimTranscript("");
    }, []);

    // Cleanup all media streams and speech synthesis on unmount
    useEffect(() => {
        return () => {
            stopSpeaking();
            stopListening();
        };
    }, [stopSpeaking, stopListening]);

    // Speech-to-Text: Listen to user's microphone
    const startListening = useCallback(() => {
        if (typeof window === "undefined") return;
        const win = window as any;
        const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setSpeechSupported(false);
            return;
        }

        // Stop current synthesis if user starts speaking
        stopSpeaking();
        stopListening();

        try {
            const recognition = new SpeechRecognitionClass();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onstart = () => {
                setIsListening(true);
                setInterimTranscript("");
            };

            recognition.onresult = (event: any) => {
                let currentInterim = "";
                let finalTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcriptPart = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPart;
                    } else {
                        currentInterim += transcriptPart;
                    }
                }

                if (finalTranscript.trim()) {
                    setInterimTranscript("");
                    setIsListening(false);
                    // Submit the user's spoken question
                    handleSendMessageText(finalTranscript.trim());
                } else {
                    setInterimTranscript(currentInterim);
                }
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition error:", event.error);
                setIsListening(false);
                setInterimTranscript("");
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (e) {
            console.error("Could not start speech recognition:", e);
            setIsListening(false);
        }
    }, [stopSpeaking, stopListening]);

    // Handle voice playback using Web Speech API with persona-specific tuning
    const speakText = useCallback((text: string) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        // Remove any markdown leftovers or brackets before speaking
        const cleanText = text.replace(/[*#_`>~]/g, "").trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Persona tuning (pitch, rate)
        const voiceKey = bookVoice.toLowerCase();
        if (voiceKey === "kabir") {
            utterance.rate = 0.90;
            utterance.pitch = 0.85; // deep, authoritative
        } else if (voiceKey === "aarav") {
            utterance.rate = 1.05;
            utterance.pitch = 1.0;  // youthful, quick
        } else if (voiceKey === "ananya") {
            utterance.rate = 0.94;
            utterance.pitch = 1.15; // gentle, expressive
        } else {
            // Priya / Rohan default
            utterance.rate = 0.96;
            utterance.pitch = 1.02; // clear, articulate
        }

        // Try selecting an English / Indian-accent voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const isFemale = voiceKey === "priya" || voiceKey === "ananya";
            const preferredVoice = voices.find((v) => {
                const name = v.name.toLowerCase();
                const lang = v.lang.toLowerCase();
                const matchesLang = lang.includes("en-in") || lang.includes("en-gb") || lang.includes("en");
                if (!matchesLang) return false;
                if (isFemale) {
                    return name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("veena") || name.includes("google uk english female");
                }
                return name.includes("male") || name.includes("david") || name.includes("rishi") || name.includes("george") || name.includes("google uk english male");
            });

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            // Hands-Free Mode: automatically listen for user's voice after AI stops speaking
            if (autoListenRef.current && isOpenRef.current) {
                setTimeout(() => {
                    if (isOpenRef.current && !isSpeakingRef.current) {
                        startListening();
                    }
                }, 600);
            }
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [bookVoice, startListening]);

    // Start Voice Interview Session
    const handleStartInterview = async () => {
        setIsLoading(true);
        setSessionError(null);
        try {
            const initialGreeting = `Hello! I'm ${
                bookVoice.charAt(0).toUpperCase() + bookVoice.slice(1)
            }, your conversational AI reading companion for "${bookTitle}" by ${bookAuthor}. What aspect of this book would you like to explore together?`;

            let newSessionId: string | null = null;

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
                    const authErrors = ["Unauthorized", "not found", "does not belong"];
                    if (authErrors.some((e) => res.error!.includes(e))) {
                        setSessionError(res.error);
                        setIsLoading(false);
                        return;
                    }
                }
                if (res.sessionId) {
                    newSessionId = res.sessionId;
                }
            }

            setSessionId(newSessionId);
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
            const fallbackGreeting = `Hello! I'm ready to discuss "${bookTitle}" with you. What questions or thoughts do you have?`;
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
        stopSpeaking();
        stopListening();
        setIsOpen(false);
        setSessionId(null);
        setSessionError(null);
        setInterimTranscript("");
    };

    // Core conversational message sender
    const handleSendMessageText = async (textToSend: string) => {
        const trimmed = textToSend.trim();
        if (!trimmed || isThinking) return;

        stopSpeaking();
        stopListening();

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
        setInputMessage("");
        setIsThinking(true);

        // Persist user turn to MongoDB
        if (sessionId) {
            addVoiceSessionMessages(sessionId, [
                { role: "user", content: trimmed, timestamp: new Date() },
            ]).catch((err) => console.error("Failed to persist user message:", err));
        }

        try {
            // Convert messages to ChatMessage format for server action
            const chatPayload: ChatMessage[] = updatedHistory.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            // Call Conversational Server Action (Gemini or Smart Semantic Engine)
            const result = await chatWithBook({
                bookTitle,
                bookAuthor,
                bookVoice,
                bookSummary,
                segments,
                messages: chatPayload,
            });

            const replyContent = result.response;
            setAiProvider(result.provider);

            const assistantMsg: Message = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: replyContent,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            setMessages((prev) => [...prev, assistantMsg]);
            setIsThinking(false);
            speakText(replyContent);

            // Persist assistant turn to MongoDB
            if (sessionId) {
                addVoiceSessionMessages(sessionId, [
                    { role: "assistant", content: replyContent, timestamp: new Date() },
                ]).catch((err) => console.error("Failed to persist assistant message:", err));
            }
        } catch (err) {
            console.error("Conversational action failed:", err);
            setIsThinking(false);

            const fallbackContent = `That's an interesting reflection on "${bookTitle}". In the book, ${bookAuthor} emphasizes grounding these insights into daily execution. What specific challenge are you hoping to solve with this concept?`;
            const assistantMsg: Message = {
                id: `ai-${Date.now()}`,
                role: "assistant",
                content: fallbackContent,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            speakText(fallbackContent);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputMessage.trim()) {
            handleSendMessageText(inputMessage);
        }
    };

    return (
        <>
            <button
                type="button"
                id="start-voice-interview-btn"
                onClick={handleStartInterview}
                disabled={isLoading}
                className={`library-cta-primary !px-6 !py-3 !text-sm flex items-center gap-2.5 transition-all shadow-soft-sm hover:shadow-soft-md ${sessionError ? "ring-2 ring-red-400" : ""}`}
                aria-label={`Start Conversational Voice Session for ${bookTitle}`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Connecting Voice Companion…</span>
                    </>
                ) : (
                    <>
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span>Start Voice Interview</span>
                    </>
                )}
            </button>

            {sessionError && (
                <p className="text-sm text-red-600 mt-2" role="alert">{sessionError}</p>
            )}

            {/* Interactive Conversational Voice Modal */}
            {isOpen && (
                <div
                    className="delete-modal-overlay !z-50 p-4 backdrop-blur-sm bg-black/40 flex items-center justify-center fixed inset-0"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="voice-interview-title"
                >
                    <div
                        className="bg-[var(--bg-card,#fff)] border border-[var(--border-subtle)] rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Session Header */}
                        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary,#faf8f5)]">
                            <div className="flex items-center gap-3.5">
                                <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-[#663820] text-white shadow-md">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    {(isSpeaking || isListening) && (
                                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isListening ? "bg-amber-400" : "bg-emerald-400"}`}></span>
                                            <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isListening ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 id="voice-interview-title" className="text-base font-serif font-bold text-[var(--text-primary)] leading-tight">
                                        {bookTitle}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            Companion: <span className="capitalize font-semibold text-[#663820]">{bookVoice}</span>
                                        </p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                            {aiProvider === "gemini" ? "✨ Gemini AI" : "🧠 Smart Engine"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Hands-Free Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setAutoListen(!autoListen)}
                                    title={autoListen ? "Hands-Free Mode: ON (Mic listens after AI speaks)" : "Hands-Free Mode: OFF"}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                                        autoListen
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                            : "bg-gray-100 text-gray-600 border-gray-200"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${autoListen ? "bg-emerald-600 animate-pulse" : "bg-gray-400"}`}></span>
                                    <span>Hands-Free</span>
                                </button>

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
                        </div>

                        {/* Live Audio & Speech Status Bar */}
                        <div className="bg-[#663820]/5 px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                {isSpeaking ? (
                                    <>
                                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="font-medium text-[#663820]">
                                            {bookVoice.toUpperCase()} is speaking…
                                        </span>
                                        <button
                                            type="button"
                                            onClick={stopSpeaking}
                                            className="ml-2 px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                        >
                                            Interrupt / Mute
                                        </button>
                                    </>
                                ) : isListening ? (
                                    <>
                                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                        <span className="font-medium text-amber-800">
                                            Listening to your voice… (Speak clearly)
                                        </span>
                                    </>
                                ) : isThinking ? (
                                    <>
                                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                        <span className="font-medium text-indigo-800">
                                            Synthesizing book concepts…
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                                        <span className="text-[var(--text-secondary)]">
                                            Ready • Tap mic or speak
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Audio Wave Visualizer Bars */}
                            <div className="flex items-center gap-1">
                                <span className={`w-1 h-3 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce" : isListening ? "bg-amber-600 animate-pulse" : "opacity-30"}`}></span>
                                <span className={`w-1 h-5 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.1s]" : isListening ? "bg-amber-600 animate-pulse [animation-delay:0.1s]" : "opacity-30"}`}></span>
                                <span className={`w-1 h-4 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.2s]" : isListening ? "bg-amber-600 animate-pulse [animation-delay:0.2s]" : "opacity-30"}`}></span>
                                <span className={`w-1 h-6 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.3s]" : isListening ? "bg-amber-600 animate-pulse [animation-delay:0.3s]" : "opacity-30"}`}></span>
                                <span className={`w-1 h-3 rounded-full bg-[#663820] ${isSpeaking ? "animate-bounce [animation-delay:0.15s]" : isListening ? "bg-amber-600 animate-pulse [animation-delay:0.15s]" : "opacity-30"}`}></span>
                            </div>
                        </div>

                        {/* Message Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-80 min-h-64 bg-[var(--bg-primary,#fcfbf9)]">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex flex-col ${
                                        msg.role === "user" ? "items-end" : "items-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                            msg.role === "user"
                                                ? "bg-[#663820] text-white rounded-br-none shadow-sm"
                                                : "bg-[var(--bg-card,#fff)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-none shadow-soft-sm"
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 px-1">
                                        <span className="text-[10px] text-[var(--text-muted,#9ca3af)]">
                                            {msg.timestamp}
                                        </span>
                                        {msg.role === "assistant" && (
                                            <button
                                                type="button"
                                                onClick={() => speakText(msg.content)}
                                                className="text-[10px] text-[#663820] hover:underline flex items-center gap-0.5"
                                                title="Replay audio"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                </svg>
                                                <span>Replay</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Live Interim Speech Bubble */}
                            {interimTranscript && (
                                <div className="flex flex-col items-end animate-pulse">
                                    <div className="max-w-[85%] rounded-2xl rounded-br-none px-4 py-2.5 text-sm bg-[#663820]/70 text-white italic border border-[#663820]">
                                        <span>🎙️ {interimTranscript}…</span>
                                    </div>
                                    <span className="text-[10px] text-amber-700 mt-1">Transcribing speech…</span>
                                </div>
                            )}

                            {/* Thinking Skeleton Indicator */}
                            {isThinking && (
                                <div className="flex flex-col items-start animate-in fade-in duration-200">
                                    <div className="rounded-2xl rounded-bl-none px-4 py-3 bg-[var(--bg-card,#fff)] border border-[var(--border-subtle)] shadow-soft-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#663820] animate-bounce"></span>
                                        <span className="w-2 h-2 rounded-full bg-[#663820] animate-bounce [animation-delay:0.15s]"></span>
                                        <span className="w-2 h-2 rounded-full bg-[#663820] animate-bounce [animation-delay:0.3s]"></span>
                                        <span className="text-xs text-[var(--text-secondary)] font-serif italic ml-1">
                                            {bookVoice} is reflecting…
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Conversation Starter Chips */}
                        <div className="px-4 py-2 bg-[var(--bg-card,#fff)] border-t border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-semibold text-[var(--text-muted,#9ca3af)] uppercase tracking-wider shrink-0 mr-1">
                                Prompts:
                            </span>
                            {CONVERSATION_STARTERS.map((starter) => (
                                <button
                                    key={starter.label}
                                    type="button"
                                    onClick={() => handleSendMessageText(starter.prompt)}
                                    disabled={isThinking}
                                    className="shrink-0 px-2.5 py-1 text-xs rounded-full bg-[var(--bg-secondary,#f8f4e9)] hover:bg-[#663820]/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition-colors text-left"
                                >
                                    {starter.label}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Voice & Text Input Form */}
                        <form
                            onSubmit={handleFormSubmit}
                            className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card,#fff)] flex items-center gap-2"
                        >
                            {/* Microphone / Speech-to-Text Button */}
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={isThinking}
                                    className={`relative p-3 rounded-2xl flex items-center justify-center transition-all ${
                                        isListening
                                            ? "bg-red-500 text-white ring-4 ring-red-200 animate-pulse"
                                            : "bg-[#663820]/10 text-[#663820] hover:bg-[#663820]/20"
                                    }`}
                                    title={isListening ? "Stop listening" : "Click to speak with AI"}
                                    aria-label={isListening ? "Stop listening" : "Speak to AI"}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                        />
                                    </svg>
                                    {isListening && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Text Input */}
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder={isListening ? "Listening to your voice…" : `Ask ${bookVoice} about ${bookTitle}…`}
                                aria-label={`Ask ${bookVoice} about ${bookTitle}`}
                                disabled={isThinking}
                                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary,#fcfbf9)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#663820]/30 transition-all"
                            />

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || isThinking}
                                className="px-5 py-2.5 rounded-xl bg-[#663820] text-white text-sm font-medium hover:bg-[#522c19] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default VoiceInterviewButton;
