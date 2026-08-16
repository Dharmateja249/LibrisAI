import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        unoptimized: true, // allow any external URL; remove once images are served from your own CDN
    },
};

export default nextConfig;
