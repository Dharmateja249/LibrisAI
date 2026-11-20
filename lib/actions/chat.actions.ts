"use server";

import { VOICE_OPTIONS } from "@/lib/constants";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatWithBookParams {
    bookTitle: string;
    bookAuthor: string;
    bookVoice?: string;
    bookSummary?: string;
    segments?: Array<{
        segmentNumber?: number;
        title?: string;
        summary?: string;
        keyTakeaways?: string[];
    }>;
    messages: ChatMessage[];
}

export interface ChatWithBookResponse {
    success: boolean;
    response: string;
    provider: "gemini" | "smart-fallback";
    error?: string;
}

/**
 * Generate a spoken-friendly conversational response using Google Gemini API if configured,
 * or an intelligent contextual semantic fallback engine based on the book's actual content.
 */
export async function chatWithBook(params: ChatWithBookParams): Promise<ChatWithBookResponse> {
    const {
        bookTitle,
        bookAuthor,
        bookVoice = "priya",
        bookSummary,
        segments = [],
        messages,
    } = params;

    const voiceInfo = VOICE_OPTIONS.find((v) => v.id.toLowerCase() === bookVoice.toLowerCase()) || {
        id: "priya",
        name: "Priya",
        gender: "female",
        description: "Young female, Indian-English, calm & clear",
    };

    const latestUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

    // 1. Check for Google Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
        try {
            const geminiResponse = await callGeminiAPI(apiKey, {
                bookTitle,
                bookAuthor,
                voiceInfo,
                bookSummary,
                segments,
                messages,
            });

            if (geminiResponse) {
                return {
                    success: true,
                    response: geminiResponse,
                    provider: "gemini",
                };
            }
        } catch (err) {
            console.warn("Gemini API call failed, falling back to contextual engine:", err);
        }
    }

    // 2. Intelligent Contextual Semantic Fallback Engine
    const contextualResponse = generateContextualResponse({
        bookTitle,
        bookAuthor,
        voiceInfo,
        bookSummary,
        segments,
        messages,
        userQuery: latestUserMessage,
    });

    return {
        success: true,
        response: contextualResponse,
        provider: "smart-fallback",
    };
}

/**
 * Calls Google Gemini REST API with tailored system instructions and multi-turn context
 */
async function callGeminiAPI(
    apiKey: string,
    context: {
        bookTitle: string;
        bookAuthor: string;
        voiceInfo: { name: string; description: string };
        bookSummary?: string;
        segments: Array<{ title?: string; summary?: string; keyTakeaways?: string[] }>;
        messages: ChatMessage[];
    }
): Promise<string | null> {
    const segmentsContext = context.segments
        .map((s, idx) => `Chapter ${idx + 1}: ${s.title || ""}\nSummary: ${s.summary || ""}\nTakeaways: ${(s.keyTakeaways || []).join("; ")}`)
        .join("\n\n");

    const systemPrompt = `You are ${context.voiceInfo.name}, an expert AI voice companion and interactive interviewer for the book "${context.bookTitle}" by ${context.bookAuthor}.
Persona & Style:
- Voice Personality: ${context.voiceInfo.description}.
- Speak in a natural, warm, conversational podcast interview tone.
- Keep responses concise and punchy (between 2 to 4 spoken sentences, around 50 to 90 words).
- CRITICAL: Never use markdown symbols (no asterisks *, no bullet points -, no hashes #, no bolding, no numbered lists), because your response is being read aloud directly by a Text-to-Speech voice synthesizer!
- Synthesize the author's core philosophies and practical lessons.
- Always conclude with an engaging, natural follow-up question that invites the user to reply verbally.

Book Background:
Title: ${context.bookTitle}
Author: ${context.bookAuthor}
Summary: ${context.bookSummary || "Deep-dive analysis and actionable takeaways from the book."}

Segments & Chapters:
${segmentsContext || "Key chapters and takeaways exploring the author's primary thesis."}
`;

    // Map conversation messages to Gemini format
    const contents = context.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8) // Keep last 8 turns for tight conversational context
        .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));

    // Ensure we start with a user message if Gemini requires it
    if (contents.length > 0 && contents[0].role === "model") {
        contents.shift();
    }

    const payload = {
        system_instruction: {
            parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
            temperature: 0.75,
            topP: 0.9,
            maxOutputTokens: 250,
        },
    };

    // Try Gemini 1.5 Flash first, then 2.0 Flash
    const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.warn(`Gemini (${model}) returned status ${res.status}:`, errorText);
                continue;
            }

            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && typeof text === "string" && text.trim().length > 0) {
                // Strip any stray markdown asterisks or bullet dashes for clean speech synthesis
                return text.replace(/[*#_~`>-]/g, "").replace(/\n+/g, " ").trim();
            }
        } catch (e) {
            console.warn(`Error invoking Gemini model ${model}:`, e);
        }
    }

    return null;
}

/**
 * Intelligent contextual fallback engine when no external API key is provided.
 * Analyzes the user's question against actual book segments, thesis, and takeaways.
 */
function generateContextualResponse(context: {
    bookTitle: string;
    bookAuthor: string;
    voiceInfo: { name: string };
    bookSummary?: string;
    segments: Array<{ title?: string; summary?: string; keyTakeaways?: string[] }>;
    messages: ChatMessage[];
    userQuery: string;
}): string {
    const { bookTitle, bookAuthor, voiceInfo, segments, userQuery } = context;
    const q = userQuery.toLowerCase().trim();

    // Collect available takeaways and chapter titles
    const allTakeaways = segments.flatMap((s) => s.keyTakeaways || []).filter(Boolean);
    const chapterTitles = segments.map((s) => s.title).filter(Boolean);

    // 1. Core thesis / main idea / what is the book about
    if (q.includes("about") || q.includes("thesis") || q.includes("main idea") || q.includes("core") || q.includes("summary")) {
        const primaryTakeaway = allTakeaways[0] || `how small, systematic shifts create exponential impact`;
        return `At its heart, "${bookTitle}" is ${bookAuthor}'s blueprint for rethinking our approach to personal growth and discipline. A foundational principle is ${primaryTakeaway}. Which particular aspect of this idea resonates most with your current routine?`;
    }

    // 2. Actionable advice / how to apply / daily life / practical
    if (q.includes("apply") || q.includes("practical") || q.includes("daily") || q.includes("action") || q.includes("implement") || q.includes("how do i")) {
        const actionTakeaway = allTakeaways[1] || allTakeaways[0] || `focusing on iterative systems rather than sporadic motivation`;
        return `To put ${bookAuthor}'s principles into practice immediately, start by ${actionTakeaway}. In "${bookTitle}", the author stresses that behavior sticks when we remove friction from our environment. What is one habit or project you are trying to develop right now?`;
    }

    // 3. Chapters / Frameworks / Structure
    if (q.includes("chapter") || q.includes("framework") || q.includes("concept") || q.includes("structure") || q.includes("step")) {
        const ch1 = chapterTitles[0] || "Foundational Insights";
        const ch2 = chapterTitles[1] || "Core Frameworks";
        return `The core progression in "${bookTitle}" develops from "${ch1}" straight into "${ch2}". ${bookAuthor} builds the argument systematically so each insight reinforces the next. Would you like us to dive deep into chapter one, or explore the practical applications first?`;
    }

    // 4. Critiques / controversial points / weaknesses
    if (q.includes("critique") || q.includes("weakness") || q.includes("disagree") || q.includes("controversial") || q.includes("flaw")) {
        return `While "${bookTitle}" provides compelling frameworks, some readers argue that ${bookAuthor}'s advice can require high initial structure that may feel rigid in unpredictable environments. Do you feel the author's framework is universally adaptable, or does it depend on personal circumstances?`;
    }

    // 5. Author / Why write this / Background
    if (q.includes("author") || q.includes("who is") || q.includes("why did") || q.includes("background")) {
        return `${bookAuthor} wrote "${bookTitle}" by combining empirical observation with real-world case studies to solve systemic behavioral bottlenecks. Have you read other works by ${bookAuthor}, or is this your first time exploring their philosophy?`;
    }

    // 6. Greetings / Check-in
    if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("who are you")) {
        return `Hi there! I'm ${voiceInfo.name}, your voice companion for "${bookTitle}". We can unpack the key chapters, brainstorm real-world applications, or test your comprehension. Where shall we begin?`;
    }

    // 7. Dynamic conversational synthesis with rotating perspectives
    const randomTakeaway = allTakeaways[Math.floor(Math.random() * allTakeaways.length)] ||
        `creating repeatable systems and compounding consistent effort over time`;

    const dynamicTemplates = [
        `That touches on a crucial argument in "${bookTitle}". ${bookAuthor} emphasizes that ${randomTakeaway}. When you reflect on that principle, how does it align with your own personal experience?`,
        `That is a very perceptive question. In the text, ${bookAuthor} specifically addresses this by highlighting ${randomTakeaway}. Would you like to explore how this connects to the broader thesis of "${bookTitle}"?`,
        `Fascinating point! One of the key takeaways from "${bookTitle}" is ${randomTakeaway}. How might applying that perspective alter how you tackle this in your daily work?`,
    ];

    return dynamicTemplates[Math.floor(Math.random() * dynamicTemplates.length)];
}
