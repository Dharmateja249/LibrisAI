import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBookDocument extends Document {
    title: string;
    author: string;
    slug: string;
    coverURL: string;
    pdfUrl?: string;
    voice: string;
    fileSize?: number;
    pagesCount?: number;
    clerkId?: string;
    status: "ready" | "processing" | "error";
    summary?: string;
    segments: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const BookSchema = new Schema<IBookDocument>(
    {
        title: {
            type: String,
            required: [true, "Book title is required"],
            trim: true,
        },
        author: {
            type: String,
            required: [true, "Author name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Book slug is required"],
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        coverURL: {
            type: String,
            default: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800",
        },
        pdfUrl: {
            type: String,
            default: "",
        },
        voice: {
            type: String,
            default: "priya",
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        pagesCount: {
            type: Number,
            default: 0,
        },
        clerkId: {
            type: String,
            default: "",
            index: true,
        },
        status: {
            type: String,
            enum: ["ready", "processing", "error"],
            default: "ready",
        },
        summary: {
            type: String,
            default: "",
        },
        segments: [
            {
                type: Schema.Types.ObjectId,
                ref: "BookSegment",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Book: Model<IBookDocument> =
    mongoose.models.Book || mongoose.model<IBookDocument>("Book", BookSchema);

export default Book;
