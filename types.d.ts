export interface BookCardProps {
    id?: string;
    title: string;
    author: string;
    coverURL: string;
    slug: string;
}

export interface VoiceOption {
    id: string;
    name: string;
    gender: "male" | "female";
    description: string;
}

export interface IBookSegment {
    _id?: string;
    bookId: string;
    segmentNumber: number;
    title: string;
    content: string;
    summary?: string;
    keyTakeaways?: string[];
    pageStart?: number;
    pageEnd?: number;
    wordCount?: number;
    audioUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBook {
    _id?: string;
    title: string;
    author: string;
    slug: string;
    coverURL?: string;
    pdfUrl?: string;
    voice?: string;
    fileSize?: number;
    pagesCount?: number;
    clerkId?: string;
    status?: "ready" | "processing" | "error";
    summary?: string;
    segments?: (string | IBookSegment)[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IVoiceMessage {
    role: "user" | "assistant" | "system";
    content: string;
    audioUrl?: string;
    timestamp: Date;
}

export interface IVoiceSession {
    _id?: string;
    bookId: string;
    clerkId: string;
    voice: string;
    status: "active" | "completed" | "paused" | "error";
    sessionDuration: number;
    messages: IVoiceMessage[];
    topicsDiscussed?: string[];
    summary?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUser {
    _id?: string;
    clerkId: string;
    email: string;
    name?: string;
    imageUrl?: string;
    plan?: "free" | "pro";
    booksUsed?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateBookSegmentInput {
    segmentNumber: number;
    title: string;
    content: string;
    summary?: string;
    keyTakeaways?: string[];
    pageStart?: number;
    pageEnd?: number;
    wordCount?: number;
    audioUrl?: string;
}

export interface CreateBookParams {
    title: string;
    author: string;
    slug?: string;
    coverURL?: string;
    pdfUrl?: string;
    voice?: string;
    fileSize?: number;
    pagesCount?: number;
    clerkId?: string;
    summary?: string;
    segments?: CreateBookSegmentInput[];
}

export interface CreateBookSegmentParams extends CreateBookSegmentInput {
    bookId: string;
}

export interface CreateVoiceSessionParams {
    bookId: string;
    clerkId: string;
    voice?: string;
    messages?: IVoiceMessage[];
}

export interface GetBooksParams {
    query?: string;
    limit?: number;
    clerkId?: string;
}
