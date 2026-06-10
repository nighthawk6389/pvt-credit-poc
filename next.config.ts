import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the build-time-seeded SQLite database with every serverless
  // function so src/lib/db.ts can copy it to /tmp at runtime on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
  },
};

export default nextConfig;
