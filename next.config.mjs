/** @type {import('next').NextConfig} */
const development = process.env.NODE_ENV !== "production";
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only the development preview may be embedded. Production stays DENY.
          ...(!development ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), microphone=(), camera=(), payment=()" },
          ...(!development ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }] : []),
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval' " : ""}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://*.tile.openstreetmap.org; connect-src 'self' ${development ? "https://*.e2b.app wss://*.e2b.app " : ""}; worker-src 'self'; frame-ancestors ${development ? "'self' https://arena.ai https://*.arena.ai https://*.e2b.app" : "'none'"};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
