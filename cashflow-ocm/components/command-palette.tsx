'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search, CornerDownLeft, Users, ShoppingCart, TrendingUp, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibleRoutes, isRouteActive } from '@/lib/nav-routes'
import { formatCompact, formatTanggalPendek } from '@/lib/format'
import { searchAll, type SearchResults } from '@/lib/search-actions'

/**
 * Command Palette — pencarian DATA lintas modul + navigasi halaman (gaya cmdk),
 * tanpa dependency baru. Di atas Radix Dialog. Buka via tombol Cari (bottom-nav,
 * event `ocm-open-search`) atau Cmd/Ctrl+K.
 *
 * Ketik ≥2 char → cari peron + transaksi (debounce). <2 char → daftar halaman.
 * Hasil dikelompokkan: Peron · Pembelian · Penjualan · Halaman. Navigasi halaman
 * lama TETAP berfungsi (digabung, bukan dibuang).
 */

type RawItem = {
  key: string
  icon: LucideIcon
  title: string
  sub?: string
  current?: boolean
  onSelect: () => void
}
type Item = RawItem & { i: number }

export function CommandPalette({
  isOwner,
  perms,
  showTrigger = true,
}: {
  isOwner?: boolean
  perms?: { pembelian?: boolean; penjualan?: boolean; kas?: boolean; biaya?: boolean }
  showTrigger?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [data, setData] = React.useState<SearchResults | null>(null)
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const openRef = React.useRef(false)
  const reqId = React.useRef(0)

  const routes = React.useMemo(() => visibleRoutes(isOwner, perms), [isOwner, perms])
  const q = query.trim()
  const qLower = q.toLowerCase()
  const searching = q.length >= 2

  const go = React.useCallback(
    (path: string) => {
      setOpen(false)
      router.push(path)
    },
    [router],
  )

  // Buka palette dalam keadaan bersih (reset di event handler, bukan effect).
  const openPalette = React.useCallback(() => {
    setQuery('')
    setActive(0)
    setData(null)
    setLoading(false)
    setOpen(true)
  }, [])

  // Input berubah: reset highlight + atur loading di sini (event handler),
  // agar tak ada setState sinkron di dalam body effect.
  function onQueryChange(value: string) {
    setQuery(value)
    setActive(0)
    if (value.trim().length >= 2) {
      setLoading(true)
    } else {
      setLoading(false)
      setData(null)
    }
  }

  // Filter halaman (instan, client-side).
  const routeItems = React.useMemo<RawItem[]>(() => {
    const filtered = qLower
      ? routes.filter((r) => r.label.toLowerCase().includes(qLower) || r.group.toLowerCase().includes(qLower))
      : routes
    return filtered.map((r) => ({
      key: `route:${r.path}`,
      icon: r.icon,
      title: r.label,
      current: isRouteActive(pathname, r.path),
      onSelect: () => go(r.path),
    }))
  }, [routes, qLower, pathname, go])

  // Cari data (debounce 250ms). setState HANYA di dalam callback async.
  React.useEffect(() => {
    if (!open || q.length < 2) return
    const id = ++reqId.current
    const t = setTimeout(async () => {
      try {
        const res = await searchAll(q)
        if (reqId.current === id) setData(res)
      } catch {
        if (reqId.current === id) setData(null)
      } finally {
        if (reqId.current === id) setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  // Susun section + flatten untuk navigasi keyboard.
  const { sections, flat } = React.useMemo(() => {
    const rawSections: { heading: string | null; items: RawItem[] }[] = []

    if (searching && data) {
      if (data.peron.length) {
        rawSections.push({
          heading: 'Peron',
          items: data.peron.map((p) => {
            const sub = [p.kode != null ? `#${p.kode}` : null, p.kontak].filter(Boolean).join(' · ')
            return { key: `peron:${p.id}`, icon: Users, title: p.nama, sub: sub || undefined, onSelect: () => go(`/peron/${p.id}`) }
          }),
        })
      }
      if (data.pembelian.length) {
        rawSections.push({
          heading: 'Pembelian',
          items: data.pembelian.map((p) => ({
            key: `pb:${p.id}`,
            icon: ShoppingCart,
            title: p.peronNama ?? p.kategori,
            sub: `${formatTanggalPendek(p.tanggal)} · ${formatCompact(p.totalBeli)}`,
            onSelect: () => go('/pembelian'),
          })),
        })
      }
      if (data.penjualan.length) {
        rawSections.push({
          heading: 'Penjualan',
          items: data.penjualan.map((p) => {
            const label = p.noBast?.trim() || p.noInvoice?.split('\n')[0]?.trim() || formatTanggalPendek(p.tanggal)
            return {
              key: `pj:${p.id}`,
              icon: TrendingUp,
              title: `Penjualan · ${label}`,
              sub: `${formatTanggalPendek(p.tanggal)}${p.nominal != null ? ` · ${formatCompact(p.nominal)}` : ''}`,
              onSelect: () => go('/penjualan'),
            }
          }),
        })
      }
    }

    if (routeItems.length) {
      rawSections.push({ heading: searching ? 'Halaman' : null, items: routeItems })
    }

    let counter = 0
    const built = rawSections.map((s) => ({
      heading: s.heading,
      items: s.items.map((it): Item => ({ ...it, i: counter++ })),
    }))
    return { sections: built, flat: built.flatMap((s) => s.items) }
  }, [searching, data, routeItems, go])

  // Cmd/Ctrl+K global toggle (pakai openRef agar tak rebind tiap toggle).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (openRef.current) setOpen(false)
        else openPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPalette])

  // Buka dari luar (tombol Cari di bottom nav) via custom event.
  React.useEffect(() => {
    const onOpen = () => openPalette()
    window.addEventListener('ocm-open-search', onOpen)
    return () => window.removeEventListener('ocm-open-search', onOpen)
  }, [openPalette])

  // Sinkron openRef + fokus input saat terbuka (DOM side-effect, bukan setState).
  React.useEffect(() => {
    openRef.current = open
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      flat[active]?.onSelect()
    }
  }

  const showEmpty = searching && !loading && flat.length === 0

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={openPalette}
          aria-label="Cari"
          className="tactile flex h-11 w-11 items-center justify-center rounded-full text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Search className="h-[21px] w-[21px]" />
        </button>
      )}

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="depth-backdrop fixed inset-0 z-50 bg-black/30 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              'glass-panel fixed left-1/2 top-[10%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2',
              'overflow-hidden rounded-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            )}
          >
            <DialogPrimitive.Title className="sr-only">Cari</DialogPrimitive.Title>

            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4">
              <Search className="h-[18px] w-[18px] shrink-0 text-stone-400 dark:text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Cari peron, transaksi, halaman…"
                className="flex-1 bg-transparent py-4 text-[15px] text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 outline-none"
              />
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-400 dark:text-zinc-500" />
              ) : (
                <kbd className="hidden sm:flex items-center gap-1 rounded-md border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 dark:text-zinc-500">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results */}
            <div role="listbox" aria-label="Hasil pencarian" className="max-h-[56vh] overflow-y-auto p-2">
              {q.length === 1 && (
                <p className="px-3 py-6 text-center text-sm text-stone-400 dark:text-zinc-500">
                  Ketik minimal 2 huruf untuk mencari data.
                </p>
              )}

              {loading && flat.length === 0 && q.length >= 2 && (
                <p className="flex items-center justify-center gap-2 px-3 py-6 text-center text-sm text-stone-400 dark:text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Mencari…
                </p>
              )}

              {showEmpty && (
                <p className="px-3 py-6 text-center text-sm text-stone-400 dark:text-zinc-500">
                  Tidak ada hasil untuk “{q}”.
                </p>
              )}

              {sections.map((section) => (
                <div key={section.heading ?? 'nav'} className="mb-1 last:mb-0">
                  {section.heading && (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                      {section.heading}
                    </p>
                  )}
                  {section.items.map((it) => {
                    const Icon = it.icon
                    const isKeyActive = it.i === active
                    return (
                      <button
                        key={it.key}
                        type="button"
                        role="option"
                        aria-selected={isKeyActive}
                        ref={isKeyActive ? (el) => { el?.scrollIntoView({ block: 'nearest' }) } : undefined}
                        onMouseEnter={() => setActive(it.i)}
                        onClick={it.onSelect}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          isKeyActive ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/5',
                        )}
                      >
                        <Icon
                          className={cn('h-[18px] w-[18px] shrink-0', it.current ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-zinc-400')}
                          strokeWidth={it.current ? 2.25 : 1.75}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-sm', it.current ? 'font-semibold text-stone-900 dark:text-white' : 'font-medium text-stone-800 dark:text-zinc-200')}>
                            {it.title}
                          </span>
                          {it.sub && (
                            <span className="block truncate text-[12px] tabular-nums text-stone-400 dark:text-zinc-500">{it.sub}</span>
                          )}
                        </span>
                        {it.current && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-900 dark:bg-white" />}
                        {isKeyActive && !it.current && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-stone-400 dark:text-zinc-500" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
