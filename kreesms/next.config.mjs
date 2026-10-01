/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep node-native backend deps out of the bundle so Sequelize
  // can require('pg') at runtime (fixes "Please install pg package manually").
  // NOTE: production builds use webpack (`next build --webpack` in package.json)
  // because Turbopack's externalization drops these from the Vercel lambda trace.
  serverExternalPackages: [
    "sequelize",
    "pg",
    "pg-hstore",
    "bcryptjs",
    "jsonwebtoken",
    "nodemailer",
    "node-cron",
  ],
  // Force the Vercel file-tracer to pack the DB driver into API lambdas.
  // (Turbopack/webpack traces have dropped it, causing
  // "Please install pg package manually" at runtime.)
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/sequelize/**/*",
      "./node_modules/pg/**/*",
      "./node_modules/pg-hstore/**/*",
    ],
  },
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
