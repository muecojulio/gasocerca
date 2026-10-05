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
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval' " : ""}https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com https://api.qrserver.com; connect-src 'self' ${development ? "https://*.e2b.app wss://*.e2b.app " : ""}https://publicacionexterna.azurewebsites.net https://nominatim.openstreetmap.org https://router.project-osrm.org https://*.tile.openstreetmap.org; worker-src 'self'; frame-ancestors ${development ? "'self' https://arena.ai https://*.arena.ai https://*.e2b.app" : "'none'"};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
