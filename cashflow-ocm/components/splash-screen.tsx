/**
 * SplashScreen — tampil saat sesi sedang dicek (loading root). Branded OCM,
 * latar gelap selaras login/app (BUKAN putih). Minimalis premium, safe-area.
 */
export function SplashScreen() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0A0A0A] px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        {/* Monogram OCM — identitas app */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-solid)] text-lg font-bold tracking-tight text-white shadow-[0_8px_28px_rgba(14,122,88,0.4)]">
          OCM
        </div>
        {/* Shimmer bar */}
        <div className="mt-6 h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--brand-solid)]" />
        </div>
      </div>
    </div>
  )
}
