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
  // Error TypeScript MENGGAGALKAN build — penting untuk app keuangan agar bug tipe
  // tidak lolos ke produksi. Source sudah lulus `tsc --noEmit` strict.
  typescript: { ignoreBuildErrors: false },
  turbopack: {},
};
export default nextConfig;