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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        ],
      },
    ]
  },
};
export default nextConfig;
