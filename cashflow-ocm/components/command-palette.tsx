'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibleRoutes, type AppRoute } from '@/lib/nav-routes'

/**
 * Command Palette — pencarian halaman cepat (gaya cmdk) tanpa dependency baru.
 * Dibangun di atas Radix Dialog yang sudah ada di proyek. Monokrom, minimalist,
 * tanpa glow/oranye. Buka via tombol Search di header atau Cmd/Ctrl+K.
 */
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
  const inputRef = React.useRef<HTMLInputElement>(null)

  const routes = React.useMemo(() => visibleRoutes(isOwner, perms), [isOwner, perms])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return routes
    return routes.filter(
      (r) => r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q),
    )
  }, [query, routes])

  // Cmd/Ctrl+K global toggle.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Buka dari luar (mis. tombol Search di bottom nav) via custom event.
  React.useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('ocm-open-search', onOpen)
    return () => window.removeEventListener('ocm-open-search', onOpen)
  }, [])

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // fokus input setelah animasi buka
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  React.useEffect(() => setActive(0), [query])

  function go(route?: AppRoute) {
    if (!route) return
    setOpen(false)
    router.push(route.path)
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[active])
    }
  }

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Cari halaman"
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
              'glass-panel fixed left-1/2 top-[12%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2',
              'overflow-hidden rounded-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            )}
          >
            <DialogPrimitive.Title className="sr-only">Cari halaman</DialogPrimitive.Title>

            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4">
              <Search className="h-[18px] w-[18px] shrink-0 text-stone-400 dark:text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Cari halaman…"
                className="flex-1 bg-transparent py-4 text-[15px] text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-1 rounded-md border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-stone-400 dark:text-zinc-500">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div role="listbox" aria-label="Hasil pencarian halaman" className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-stone-400 dark:text-zinc-500">
                  Tidak ada halaman cocok.
                </p>
              ) : (
                results.map((r, i) => {
                  const Icon = r.icon
                  const isKeyActive = i === active
                  const isCurrentPage = pathname === r.path || (r.path !== '/dashboard' && pathname.startsWith(r.path))
                  return (
                    <button
                      key={r.path}
                      type="button"
                      role="option"
                      aria-selected={isKeyActive}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        isKeyActive
                          ? 'bg-black/5 dark:bg-white/10'
                          : 'hover:bg-black/[0.03] dark:hover:bg-white/5',
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', isCurrentPage ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-zinc-400')} strokeWidth={isCurrentPage ? 2.25 : 1.75} />
                      <span className={cn('flex-1 text-sm', isCurrentPage ? 'font-semibold text-stone-900 dark:text-white' : 'font-medium text-stone-800 dark:text-zinc-200')}>
                        {r.label}
                      </span>
                      {isCurrentPage && (
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-900 dark:bg-white shrink-0" />
                      )}
                      {isKeyActive && !isCurrentPage && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-stone-400 dark:text-zinc-500" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
