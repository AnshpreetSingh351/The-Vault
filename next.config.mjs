/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 🚀 This creates the 'out' folder Render needs
  images: {
    unoptimized: true, // Required for static export images
  },
};

export default nextConfig;