'use client'

/** Tombol coba-lagi: reload halaman (re-attempt service worker/jaringan), bukan
 *  navigasi <a> yang justru gagal lagi saat masih offline. */
export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-solid)] px-6 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(14,122,87,0.4)] transition-all hover:brightness-110 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-screen-bg)]"
    >
      Coba lagi
    </button>
  )
}
