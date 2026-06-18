// Portal publik /p/[token] — SELALU terang (apa pun tema sistem). Skeleton ikut
// dipaksa terang: pakai hex eksplisit (#FFFFFF) & zinc (tak dijaring catch-all dark)
// agar `bg-white` tidak ter-flip ke #28282B di perangkat bertema gelap.
export default function Loading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#F6F7F6] px-4 py-6"
      style={{ colorScheme: 'light' }}
    >
      <div
        role="status"
        aria-busy="true"
        className="mx-auto max-w-md animate-pulse space-y-3"
      >
        <span className="sr-only">Memuat…</span>
        {/* Header: monogram + judul */}
        <div className="flex items-center gap-3 px-1 py-2">
          <div className="h-10 w-10 rounded-xl bg-zinc-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-zinc-200" />
            <div className="h-2.5 w-20 rounded bg-zinc-100" />
          </div>
        </div>
        {/* Hero ringkasan */}
        <div className="h-28 rounded-2xl bg-zinc-200/70" />
        {/* Kartu daftar */}
        <div className="space-y-3 rounded-2xl bg-[#FFFFFF] p-4 ring-1 ring-zinc-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-zinc-200" />
              <div className="h-3.5 w-16 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
