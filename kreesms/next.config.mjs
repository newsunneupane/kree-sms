/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep node-native backend deps out of the Turbopack bundle so Sequelize
  // can require('pg') at runtime (fixes "Please install pg package manually").
  serverExternalPackages: [
    "sequelize",
    "pg",
    "pg-hstore",
    "bcryptjs",
    "jsonwebtoken",
    "nodemailer",
    "node-cron",
  ],
  // Helmet replacement: secure defaults for all responses.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
