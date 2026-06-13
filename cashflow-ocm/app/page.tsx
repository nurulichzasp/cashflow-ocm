import { WelcomeScreen } from '@/components/welcome-screen'

/**
 * Root "/" — momen "buka app". SELALU tampilkan opening (WelcomeScreen) untuk
 * SEMUA user, lalu lanjut ke /login → /dashboard. Tidak ada lagi auto-skip
 * authed → /dashboard, jadi alur entri konsisten: opening → login → masuk.
 *
 * Catatan: logo OCM di dalam app menuju /dashboard (lihat mobile-header.tsx),
 * BUKAN "/", jadi klik logo di tengah sesi tidak terbawa ke opening.
 */
export default function Home() {
  return <WelcomeScreen />
}
