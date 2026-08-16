export interface BookCardProps {
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
