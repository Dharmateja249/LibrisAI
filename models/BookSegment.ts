import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBookSegmentDocument extends Document {
    bookId: Types.ObjectId;
    segmentNumber: number;
    title: string;
    content: string;
    summary?: string;
    keyTakeaways: string[];
    pageStart?: number;
    pageEnd?: number;
    wordCount?: number;
    audioUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookSegmentSchema = new Schema<IBookSegmentDocument>(
    {
        bookId: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: [true, "Book ID is required"],
            index: true,
        },
        segmentNumber: {
            type: Number,
            required: [true, "Segment number is required"],
        },
        title: {
            type: String,
            required: [true, "Segment title is required"],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Segment content is required"],
        },
        summary: {
            type: String,
            default: "",
        },
        keyTakeaways: {
            type: [String],
            default: [],
        },
        pageStart: {
            type: Number,
            default: 0,
        },
        pageEnd: {
            type: Number,
            default: 0,
        },
        wordCount: {
            type: Number,
            default: 0,
        },
        audioUrl: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for fast lookup of ordered segments within a book
BookSegmentSchema.index({ bookId: 1, segmentNumber: 1 });

const BookSegment: Model<IBookSegmentDocument> =
    mongoose.models.BookSegment ||
    mongoose.model<IBookSegmentDocument>("BookSegment", BookSegmentSchema);

export default BookSegment;
