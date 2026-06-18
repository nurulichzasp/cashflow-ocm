'use client'

import * as React from 'react'
import { Ellipsis, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Satu aksi baris. Aksi destruktif memberi `confirm` agar lewat AlertDialog dulu.
// `busy` di confirm dibaca reaktif (lookup per-render) sehingga tombol bisa
// menampilkan status "Menghapus…" selama server action berjalan.
export interface RowAction {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  /** Warna merah + (biasanya) konfirmasi. */
  destructive?: boolean
  /** Garis pemisah TEPAT sebelum item ini. */
  separated?: boolean
  /** Elemen kecil di ujung kanan item (mis. dot "mode terakhir"). */
  trailing?: React.ReactNode
  /** Bila diisi, item membuka AlertDialog konfirmasi sebelum onSelect dijalankan. */
  confirm?: {
    title: string
    description?: string
    confirmLabel?: string
    busyLabel?: string
    busy?: boolean
  }
}

interface RowActionMenuProps {
  actions: RowAction[]
  /** 'menu' = dropdown (desktop), 'sheet' = bottom sheet (mobile). */
  variant: 'menu' | 'sheet'
  /** Judul header sheet (mobile) — mis. nama peron. */
  title?: string
  /** Sub-judul header sheet — mis. No. nota. */
  subtitle?: string
  triggerLabel?: string
  triggerClassName?: string
}

/**
 * Kebab (⋯) di ujung kanan baris → membuka menu aksi berlabel.
 * - mobile  : bottom sheet (action sheet) — hormati safe-area bawah.
 * - desktop : dropdown anchored ke kebab.
 * Generic & theme-agnostic agar bisa dipakai ulang di modul lain (Penjualan/Kas/Biaya).
 */
export function RowActionMenu({
  actions,
  variant,
  title,
  subtitle,
  triggerLabel = 'Aksi',
  triggerClassName,
}: RowActionMenuProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [confirmKey, setConfirmKey] = React.useState<string | null>(null)

  // Lookup per-render → `confirm.busy` selalu segar; null bila item menghilang.
  const confirmAction = confirmKey ? actions.find((a) => a.key === confirmKey) ?? null : null

  function handleSelect(a: RowAction) {
    if (a.confirm) {
      setSheetOpen(false) // no-op untuk variant menu
      setConfirmKey(a.key)
      return
    }
    a.onSelect()
    setSheetOpen(false)
  }

  // Tap kebab tidak boleh ikut men-trigger aksi tap baris (mis. expand/detail).
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const triggerCls = cn(
    'tap-pad inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] aria-expanded:bg-stone-100 dark:aria-expanded:bg-white/[0.06] data-[popup-open]:bg-stone-100 dark:data-[popup-open]:bg-white/[0.06]',
    triggerClassName,
  )

  return (
    <>
      {variant === 'menu' ? (
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={triggerLabel} title={triggerLabel} className={triggerCls} onClick={stop}>
            <Ellipsis className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[188px]">
            {actions.map((a) => (
              <React.Fragment key={a.key}>
                {a.separated && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  variant={a.destructive ? 'destructive' : 'default'}
                  onClick={() => handleSelect(a)}
                  className="gap-2 cursor-pointer"
                >
                  <a.icon className="h-4 w-4" />
                  <span className="flex-1">{a.label}</span>
                  {a.trailing}
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger aria-label={triggerLabel} className={triggerCls} onClick={stop}>
            <Ellipsis className="h-5 w-5" aria-hidden />
          </SheetTrigger>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="rounded-t-2xl gap-1 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          >
            {(title || subtitle) && (
              <SheetHeader className="gap-0.5 pb-1 text-left">
                {title && <SheetTitle className="truncate">{title}</SheetTitle>}
                {subtitle && (
                  <p className="truncate text-xs text-stone-500 dark:text-zinc-500">{subtitle}</p>
                )}
              </SheetHeader>
            )}
            <div className="flex flex-col px-2 pb-1">
              {actions.map((a) => (
                <React.Fragment key={a.key}>
                  {a.separated && <div className="mx-2 my-1 h-px bg-border" />}
                  <button
                    type="button"
                    onClick={() => handleSelect(a)}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors active:scale-[0.99]',
                      a.destructive
                        ? 'text-crit hover:bg-destructive/10'
                        : 'text-stone-700 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                    )}
                  >
                    <a.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 text-left">{a.label}</span>
                    {a.trailing}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Konfirmasi aksi destruktif — sibling dari trigger agar tak terjepit di portal sheet/menu. */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmKey(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.confirm?.title ?? 'Konfirmasi'}</AlertDialogTitle>
            {confirmAction?.confirm?.description && (
              <AlertDialogDescription>{confirmAction.confirm.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={confirmAction?.confirm?.busy}
              onClick={() => confirmAction?.onSelect()}
            >
              {confirmAction?.confirm?.busy
                ? confirmAction.confirm.busyLabel ?? 'Memproses…'
                : confirmAction?.confirm?.confirmLabel ?? 'Lanjut'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
