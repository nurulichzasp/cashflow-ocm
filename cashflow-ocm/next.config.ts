import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: [
    'better-auth',
    '@better-auth/core',
    '@better-auth/drizzle-adapter',
    '@better-auth/kysely-adapter',
    '@libsql/client',
    'drizzle-orm',
    'xlsx',
  ],
  typescript: { ignoreBuildErrors: true },
  turbopack: {},
};
export default nextConfig;