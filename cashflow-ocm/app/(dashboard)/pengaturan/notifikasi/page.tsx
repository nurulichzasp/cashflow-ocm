export const dynamic = 'force-dynamic'

import { Send, ShoppingCart, Receipt, Wallet2, CalendarClock, CheckCircle2, AlertCircle } from 'lucide-react'
import { SettingHeader } from '../_components/setting-header'
import { requireSettingsSession } from '../_components/require-session'

export default async function NotifikasiPage() {
  await requireSettingsSession()

  const telegramConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)

  const events = [
    { icon: ShoppingCart, title: 'Pembelian Baru', desc: 'Tiket sawit masuk ke grup' },
    { icon: Receipt, title: 'Penjualan Baru', desc: 'Invoice BGA tercatat' },
    { icon: Wallet2, title: 'Biaya Operasional', desc: 'Pengeluaran baru dicatat' },
    { icon: CalendarClock, title: 'Ringkasan Harian', desc: 'Rekap otomatis tiap sore' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <SettingHeader
        title="Notifikasi"
        description="Notifikasi transaksi & laporan otomatis dikirim ke Telegram."
      />

      {/* Status koneksi Telegram */}
      <div className="surface p-4">
        <div className="flex items-center gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/[0.06] dark:text-stone-300">
            <Send className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">Bot Telegram</p>
            <p className="text-[13px] text-stone-500 dark:text-stone-400">
              Kanal pengiriman notifikasi realtime
            </p>
          </div>
          {telegramConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terhubung
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Belum diatur
            </span>
          )}
        </div>
        {!telegramConfigured && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400/90">
            Atur <code className="font-mono">TELEGRAM_BOT_TOKEN</code> dan{' '}
            <code className="font-mono">TELEGRAM_CHAT_ID</code> pada environment server untuk
            mengaktifkan notifikasi.
          </p>
        )}
      </div>

      {/* Daftar event yang memicu notifikasi */}
      <div className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Peristiwa yang dikirim
        </h2>
        <div className="surface overflow-hidden p-0 divide-y divide-stone-100 dark:divide-white/[0.06]">
          {events.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 dark:bg-white/[0.06] dark:text-stone-300">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{title}</p>
                <p className="text-[13px] text-stone-500 dark:text-stone-400">{desc}</p>
              </div>
              <span
                className={
                  telegramConfigured
                    ? 'text-xs font-semibold text-[var(--brand)]'
                    : 'text-xs font-medium text-stone-400 dark:text-stone-500'
                }
              >
                {telegramConfigured ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
