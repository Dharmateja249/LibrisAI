import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IVoiceMessage {
    role: "user" | "assistant" | "system";
    content: string;
    audioUrl?: string;
    timestamp: Date;
}

export interface IVoiceSessionDocument extends Document {
    bookId: Types.ObjectId;
    clerkId: string;
    voice: string;
    status: "active" | "completed" | "paused" | "error";
    sessionDuration: number;
    messages: IVoiceMessage[];
    topicsDiscussed: string[];
    summary?: string;
    createdAt: Date;
    updatedAt: Date;
}

const VoiceMessageSchema = new Schema<IVoiceMessage>(
    {
        role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: [true, "Message role is required"],
        },
        content: {
            type: String,
            required: [true, "Message content is required"],
        },
        audioUrl: {
            type: String,
            default: "",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: false,
    }
);

const VoiceSessionSchema = new Schema<IVoiceSessionDocument>(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: [true, "Book ID is required"],
            index: true,
        },
        clerkId: {
            type: String,
            required: [true, "Clerk ID is required"],
            index: true,
        },
        voice: {
            type: String,
            default: "priya",
        },
        status: {
            type: String,
            enum: ["active", "completed", "paused", "error"],
            default: "active",
        },
        sessionDuration: {
            type: Number,
            default: 0,
        },
        messages: {
            type: [VoiceMessageSchema],
            default: [],
        },
        topicsDiscussed: {
            type: [String],
            default: [],
        },
        summary: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for finding user sessions by book
VoiceSessionSchema.index({ clerkId: 1, bookId: 1, createdAt: -1 });

const VoiceSession: Model<IVoiceSessionDocument> =
    mongoose.models.VoiceSession ||
    mongoose.model<IVoiceSessionDocument>("VoiceSession", VoiceSessionSchema);

export default VoiceSession;
