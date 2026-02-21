/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
