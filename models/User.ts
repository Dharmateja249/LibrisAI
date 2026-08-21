import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserDocument extends Document {
    clerkId: string;
    email: string;
    name?: string;
    imageUrl?: string;
    plan: "free" | "pro";
    booksUsed: number;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
    {
        clerkId: {
            type: String,
            required: [true, "Clerk ID is required"],
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            default: "",
        },
        imageUrl: {
            type: String,
            default: "",
        },
        plan: {
            type: String,
            enum: ["free", "pro"],
            default: "free",
        },
        booksUsed: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const User: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export default User;
