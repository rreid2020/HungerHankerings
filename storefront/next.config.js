/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production: absolute URLs use Host + https instead of https://127.0.0.1:PORT (requires NOT passing
  // -H to `next start` — see deploy/app-platform/supervisord.conf). Clerk needs matching proto via nginx.
  experimental: {
    trustHostHeader: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ]
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon", permanent: false }]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co"
      },
      {
        protocol: "https",
        hostname: "www.gstatic.com"
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org"
      }
    ]
  }
}

module.exports = nextConfig
