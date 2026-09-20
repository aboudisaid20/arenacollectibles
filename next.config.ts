import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // 448 added so a 200px cell at 2x resolves to 448 rather than jumping
    // to the 640 device breakpoint — roughly halves the hero payload.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 448],
    qualities: [60, 75, 90],
  },
  experimental: {
    // Rewrites barrel imports to deep paths so only the icons actually
    // used are bundled.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
